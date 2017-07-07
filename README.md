# circleci-weigh-in
**NOTE: Only works with GitHub repositories.**

A CircleCI integration for tracking file size changes across deploys.

## What it Does
- Saves file containing file sizes of assets (by reading from webpack stats output) to the `$CIRCLE_ARTIFACTS/circleci-weigh-in/bundle-sizes.json` directory in order to save it as an artifact for later reference.

  Example output:

```json
{
  "app.css": {
    "size": 52336,
    "path": "webcreator_public/css/app.54bbcf6f50ed582c98f5cf3841d5c837.css"
  },
  "app.js": {
    "size": 408489,
    "path": "webcreator_public/js/app.18db3f4eb6b95f3ac8ea.js"
  },
  "manifest.js": {
    "size": 1463,
    "path": "webcreator_public/js/manifest.5cb70be29d3945c8ee59.js"
  },
  "vendor.js": {
    "size": 2284786,
    "path": "webcreator_public/js/vendor.af1abaa45f10408b578e.js"
  }
}
```

- Generates diff of base branch file sizes with current branch.

- Saves file containing that diff information to `$CIRCLE_ARTIFACTS/circleci-weigh-in/bundle-sizes-diff.json`.

  Example output

```json
{
  "app.css": {
    "current": 52336,
    "original": 52336,
    "difference": 0,
    "percentChange": 0
  },
  "app.js": {
    "current": 408489,
    "original": 408489,
    "difference": 0,
    "percentChange": 0
  },
  "manifest.js": {
    "current": 1463,
    "original": 1463,
    "difference": 0,
    "percentChange": 0
  },
  "vendor.js": {
    "current": 2284786,
    "original": 2284786,
    "difference": 0,
    "percentChange": 0
  }
}
```

- Posts that diff as a status to PR associated with the build.

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
    <td><code>--stats-filepath</code></td>
    <td>Filepath of the webpack stats object to read from.</td>
    <td><code>String</code></td>
    <td>Yes</td>
    <td></td>
  </tr>
  <tr>
    <td><code>--manifest-filepath</code></td>
    <td>Filepath of the manifest object to read from. Only required if you are fingerprinting your files. Recommended plugin for generating this manifest file: https://github.com/danethurber/webpack-manifest-plugin.</td>
    <td><code>String</code></td>
    <td>No</td>
    <td></td>
  </tr>
  <tr>
    <td><code>--failure-threshold</code></td>
    <td>The number representing the percentage increase in bundle size at which the GitHub status will be posted as failed. Example: If you set this to <code>3.00</code> and <b>any</b> of the bundles grow by more than 3.00%, then the status check will be posted as "failure." <a href="https://developer.github.com/v3/repos/statuses/#create-a-status">[link]</a></td>
    <td><code>Number</code></td>
    <td>No</td>
    <td><code>5.00</code></td>
  </tr>
</table>

## Required Environment Variables

### [CircleCI Built-ins](https://circleci.com/docs/1.0/environment-variables/)
- `CIRCLE_ARTIFACTS`
- `CIRCLE_PROJECT_USERNAME`
- `CIRCLE_PROJECT_REPONAME`
- `CIRCLE_SHA1`
- `CI_PULL_REQUEST`
- `CIRCLE_BUILD_URL`

### Manual
- `GITHUB_API_TOKEN`
  - Must have read access to repository (`public_repo` scope for public repos, and `repo` scope for private repos)
  - Must have `repo:status` scope
- `CIRCLE_API_TOKEN`
  - Must have `view-builds` scope
