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

### --stats-filepath
- Description: Filepath of the webpack stats object to read from.
- Type: `String`
- Required?: `true`
- Default Value: `N/A`

### --project-name
- Description: The name of the project for which the bundle stats will be generated. (This is useful in monorepo situations where you may want to generate bundle stats for multiple projects during the same build.) Bundle size artifact filenames (`[PROJECT_NAME]/bundle-sizes.json`/`[PROJECT_NAME]/bundle-sizes-diff.json`) and the CI status label (`Bundle Sizes: [PROJECT_NAME]`) will be updated accordingly.
- Type: `String`
- Required?: `false`
- Default Value: `N/A`

### --failure-threshold
- Description: The number representing the percentage increase in bundle size at which the GitHub status will be posted as failed. Example: If you set this to `3.00` and **any** of the bundles grow by more than `3.00%`, then the status check will be posted as "failure." [[link](https://developer.github.com/v3/repos/statuses/#create-a-status)]
- Type: `Number`
- Required?: `false`
- Default Value: `5.00`

## Required Environment Variables

### [CircleCI Built-ins](https://circleci.com/docs/1.0/environment-variables/)
- `CIRCLE_ARTIFACTS`<sup>[2.0](#circleci-2.0-notes)</sup>
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

### CircleCI 2.0 Notes
The `CIRCLE_ARTIFACTS` environment variable was removed in CircleCI 2.0. To workaround this, you need to define it yourself and then move the files stored there in a `store_artifacts` step. Example config file:

```yml
version: 2
jobs:
  build:
    # ...
    environment:
      - CIRCLE_ARTIFACTS: ./example/dist/artifacts
    steps:
      # ...
      - store_artifacts:
          # Wish I could use $CIRCLE_ARTIFACTS here :( (http://bit.ly/2vlqGiR)
          path: ./example/dist/artifacts
          destination: ./
```
