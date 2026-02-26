/**
 * Entry point for Asana-GitHub Sync Action
 * v2.0: Rules engine with YAML-based configuration
 */

import * as core from "@actions/core"
import * as github from "@actions/github"
import { readRulesConfig } from "./util/config"
import { validateRulesConfig } from "./rules/validator"
import { buildRuleContext, executeRules, buildCommentContext } from "./rules/engine"
import { extractAsanaTaskIds } from "./util/parser"
import {
  fetchAllTaskDetails,
  updateAllTasks,
  createAllTasks,
  attachPRToExistingTasks,
  type PRMetadata,
} from "./util/asana"
import {
  appendAsanaLinkToPR,
  appendAsanaLinkToIssue,
  fetchPRComments,
  postCommentTemplates,
} from "./util/github"
import { registerHelpers } from "./expression/helpers"
import { rulesUseHelper } from "./util/template-analysis"
import { evaluateTemplate } from "./expression/evaluator"

/**
 * Task details fetched from Asana
 */
interface TaskDetails {
  gid: string
  name: string
  url: string
}

async function run(): Promise<void> {
  try {
    // Register Handlebars helpers for template evaluation
    registerHelpers()

    // Read and validate rules configuration
    core.info("Reading rules configuration...")
    const { asanaToken, githubToken, rules, userMappings, integrationSecret, dryRun } =
      readRulesConfig()

    validateRulesConfig(rules)

    core.info(`✓ Rules configuration loaded`)
    core.debug(`  - Asana token: ${asanaToken.substring(0, 3)}...`)
    core.debug(`  - GitHub token: ${githubToken.substring(0, 3)}...`)
    core.debug(`  - Rules: ${rules.rules.length} rule(s) configured`)
    if (Object.keys(userMappings).length > 0) {
      core.debug(`  - User mappings: ${Object.keys(userMappings).length} mapping(s)`)
    }
    if (integrationSecret) {
      core.debug(`  - Integration secret: configured`)
    }

    const eventName = github.context.eventName
    const isPR = eventName === "pull_request"
    const isIssue = eventName === "issues"

    if (!isPR && !isIssue) {
      core.warning(
        `Unsupported event: ${eventName}. Only pull_request and issues events are supported.`
      )
      return
    }

    // Get source number and body from the right payload
    const sourceNumber = isPR
      ? github.context.payload.pull_request?.number
      : github.context.payload.issue?.number
    const sourceBody = isPR
      ? github.context.payload.pull_request?.body || ""
      : github.context.payload.issue?.body || ""

    // Check if any rule uses extract_from_comments helper
    const needsComments = rulesUseHelper(rules.rules, "extract_from_comments")
    let comments: string | undefined

    if (needsComments) {
      core.debug("Rules use extract_from_comments, fetching comments...")
      if (sourceNumber) {
        comments = await fetchPRComments(githubToken, sourceNumber)
      } else {
        core.warning("No issue/PR number found in payload, cannot fetch comments")
        comments = ""
      }
    }

    // Extract Asana task IDs from body to determine hasAsanaTasks
    const { taskIds } = extractAsanaTaskIds(sourceBody)
    const hasAsanaTasks = taskIds.length > 0

    // Build rule context from GitHub event
    const context = buildRuleContext(github.context, comments, hasAsanaTasks, userMappings)

    const sourceLabel = isPR ? "PR" : "Issue"
    const sourceNum = context.pr?.number ?? context.issue?.number ?? 0
    const sourceTitle = context.pr?.title ?? context.issue?.title ?? ""
    const sourceUrl = context.pr?.url ?? context.issue?.url ?? ""

    core.info(`Event: ${context.eventName}, Action: ${context.action}`)
    core.info(`${sourceLabel} #${sourceNum}: ${sourceTitle}`)
    core.info(`has_asana_tasks: ${hasAsanaTasks}`)

    // Execute rules to get field updates, comment templates, task creation specs, and attach flag
    const { fieldUpdates, commentTemplates, taskCreationSpecs, attachPrToTasks } = executeRules(
      rules.rules,
      context
    )

    // SPLIT EXECUTION PATH: Task creation vs. updates
    if (taskCreationSpecs.length > 0) {
      // PATH A: Task Creation Mode
      core.info(`Creating ${taskCreationSpecs.length} task(s)...`)

      if (!sourceNumber) {
        core.error(`No ${sourceLabel.toLowerCase()} number found in payload, cannot create tasks`)
        return
      }

      // Integration attachment is PR-only (Asana integration doesn't support issues)
      const effectiveIntegrationSecret = isPR ? integrationSecret : undefined
      if (!isPR && integrationSecret) {
        core.debug("Skipping integration attachment for issues event (PR-only feature)")
      }

      const createdTasks = await createAllTasks(
        taskCreationSpecs,
        asanaToken,
        effectiveIntegrationSecret,
        {
          number: sourceNum,
          title: sourceTitle,
          body: sourceBody,
          url: sourceUrl,
        },
        dryRun
      )

      const successCount = createdTasks.filter((t) => t.success).length
      const failedCount = createdTasks.filter((t) => !t.success).length

      // Append task links to PR or issue body
      for (const task of createdTasks) {
        if (task.success) {
          if (isPR) {
            await appendAsanaLinkToPR(githubToken, sourceNumber, task.name, task.url, dryRun)
          } else {
            await appendAsanaLinkToIssue(githubToken, sourceNumber, task.name, task.url, dryRun)
          }
        }
      }

      // Post comments if configured
      if (commentTemplates.length > 0) {
        const commentContext = buildCommentContext(context, createdTasks, fieldUpdates)
        await postCommentTemplates(
          commentTemplates,
          githubToken,
          sourceNumber,
          commentContext,
          evaluateTemplate,
          dryRun
        )
      }

      // Log summary
      core.info("")
      core.info(`=== Creation Summary ===`)
      core.info(`Total tasks created: ${successCount} of ${taskCreationSpecs.length}`)
      if (failedCount > 0) {
        const failedTaskNames = createdTasks.filter((t) => !t.success).map((t) => t.name)
        core.info(`✗ Failed: ${failedCount} (${failedTaskNames.join(", ")})`)
      }
      core.info("")

      // Set outputs
      const createdTaskIds = createdTasks
        .filter((t) => t.success)
        .map((t) => t.gid)
        .join(",")
      core.setOutput("task_ids", createdTaskIds)
      core.setOutput("tasks_created", successCount.toString())
    } else if (taskIds.length > 0) {
      // PATH B: Update Existing Tasks
      core.info(`Found ${taskIds.length} Asana task(s): ${taskIds.join(", ")}`)

      if (fieldUpdates.size === 0 && commentTemplates.length === 0) {
        core.info("No rules matched, skipping")
        return
      }

      core.info(`${fieldUpdates.size} field update(s) to apply`)
      if (commentTemplates.length > 0) {
        core.info(`${commentTemplates.length} comment(s) configured`)
      }

      // Fetch task details if comment templates exist
      let taskDetails: TaskDetails[] = []

      if (commentTemplates.length > 0) {
        taskDetails = await fetchAllTaskDetails(taskIds, asanaToken)
      }

      // Update all Asana tasks and collect results
      const taskResults = await updateAllTasks(
        taskIds,
        taskDetails,
        fieldUpdates,
        asanaToken,
        dryRun
      )

      const successCount = taskResults.filter((t) => t.success).length
      const failedCount = taskResults.filter((t) => !t.success).length

      // Attach PR to tasks via integration if configured (PR-only)
      if (attachPrToTasks && isPR) {
        if (integrationSecret) {
          const prMetadata: PRMetadata = {
            number: sourceNum,
            title: sourceTitle,
            body: sourceBody,
            url: sourceUrl,
          }
          await attachPRToExistingTasks(
            taskResults,
            prMetadata,
            asanaToken,
            integrationSecret,
            dryRun
          )
        } else {
          core.warning(
            "attach_pr_to_tasks is true but integration_secret is not configured, skipping"
          )
        }
      } else if (attachPrToTasks && !isPR) {
        core.warning("attach_pr_to_tasks is not supported for issues events, skipping")
      }

      // Post comments if configured
      if (commentTemplates.length > 0) {
        if (sourceNumber) {
          const commentContext = buildCommentContext(context, taskResults, fieldUpdates)
          await postCommentTemplates(
            commentTemplates,
            githubToken,
            sourceNumber,
            commentContext,
            evaluateTemplate,
            dryRun
          )
        } else {
          core.warning(
            `No ${sourceLabel.toLowerCase()} number found in payload, cannot post comments`
          )
        }
      }

      // Log summary
      core.info("")
      core.info(`=== Update Summary ===`)
      core.info(`Total tasks: ${taskResults.length}`)
      core.info(`✓ Successful: ${successCount}`)
      if (failedCount > 0) {
        const failedTaskIds = taskResults.filter((t) => !t.success).map((t) => t.gid)
        core.info(`✗ Failed: ${failedCount} (${failedTaskIds.join(", ")})`)
      }
      core.info("")

      // Set outputs
      core.setOutput("task_ids", taskIds.join(","))
      core.setOutput("tasks_updated", successCount.toString())
    } else {
      // No tasks found and no task creation rules matched
      core.info(`No Asana task links found in ${sourceLabel.toLowerCase()} body`)
    }
  } catch (error) {
    // NEVER fail the workflow - just log the error
    if (error instanceof Error) {
      core.error(`Action error: ${error.message}`)
      core.debug(error.stack || "No stack trace available")
    } else {
      core.error(`Action error: ${String(error)}`)
    }
  }
}

run()
