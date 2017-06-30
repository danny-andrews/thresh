# circleci-weigh-in
**NOTE: Only works with GitHub repositories.**

A CircleCI integration for tracking file size changes across deploys.

## What it Does
1. Saves file containing file sizes of assets (by reading from webpack stats output) to the `CIRCLE_ARTIFACTS/circleci-weigh-in/bundle-sizes.json` directory in order to save it as an artifact for later reference.

  This JSON file has the following structure:
```
{
    "[FILENAME]": {
      path: [FILEPATH],
      size: [FILESIZE]
    }
}
```

1. Generates diff of base branch file sizes with current branch.
1. Saves file containing that diff information to `CIRCLE_ARTIFACTS/circleci-weigh-in/bundle-sizes-diff.json`.
1. Posts that diff as a status to PR associated with the build.

## CLI Options
<table>
  <tr>
    <th>Name</th>
    <th>Description</th>
    <th>Type</th>
    <th>Required?</th>
    <th>Default Value</th>
  </tr>
  <tr>
    <td>`--stats-path`</td>
    <td>Filepath of the webpack stats object to read from.</td>
    <td>`String`</td>
    <td>Yes</td>
    <td></td>
  </tr>
  <tr>
    <td>`--manifest-path`</td>
    <td>Filepath of the manifest object to read from. Only required if you are fingerprinting your files. Recommended plugin for generating this manifest file: https://github.com/danethurber/webpack-manifest-plugin.</td>
    <td>`String`</td>
    <td>No</td>
    <td></td>
  </tr>
  <tr>
    <td>`--failure-threshold`</td>
    <td>The number representing the percentage increase in bundle size at which the GitHub status will be posted as failed. Example: If you set this to `3.00` and **any** of the bundles grow by more than 3.00%, then the status check will be posted as "failure." [[link](https://developer.github.com/v3/repos/statuses/#create-a-status)]</td>
    <td>`Number`</td>
    <td>No</td>
    <td>`5.00`</td>
  </tr>
</table>

## Required Environment Variables

### [CircleCI Built-ins](https://circleci.com/docs/1.0/environment-variables/)
- CIRCLE_ARTIFACTS
- CIRCLE_PROJECT_USERNAME
- CIRCLE_PROJECT_REPONAME
- CIRCLE_SHA1
- CI_PULL_REQUEST

### Manual
- GITHUB_API_TOKEN
  - Must have read access to public repo things
  - Must have write access to statuses
- CIRCLE_API_TOKEN
  - Must have 'view-builds' scope

## Failure Conditions
- Missing required env variables - Print error telling user which variable is missing
- Can't find stats file - Print error telling user we couldn't find stats file
- Can't parse stats file - Print error telling user we couldn't find stats file
- Request to CircleCI fails
  - If auth error, print error telling user to check their CIRCLE_API_TOKEN
  - If other error, print error received from Circle
- Request to GitHub fails
  - If auth error, print error telling user to check their GITHUB_API_TOKEN
  - If other error, print error received from GitHub
- Deal with new/removed bundles

## Dev Notes

### Execution Steps
1. Parse webpack stats files to retrieve size information
1. Save size info as artifact
1. Calculate diff:
  * Retrieve PR's base branch: [api docs](https://developer.github.com/v3/pulls/#get-a-single-pull-request)
  * Retrieve build number for latest build of base_branch: [api docs](https://circleci.com/docs/api/v1-reference/#recent-builds-project-branch)
  * Get of list of artifacts for that build number: [api docs](https://circleci.com/docs/api/v1-reference/#build-artifacts)
  * Download bundle size artifact: [api docs](https://circleci.com/docs/api/v1-reference/#download-artifact)
  * POST status to PR: [api docs](https://developer.github.com/v3/repos/statuses/#create-a-status)
  * Save diff as an artifact
