# thresh
Separate the wheat from the chaff in your static asset bundles.

A CircleCI integration for tracking file size changes across deploys.

## What it Does
- Saves file containing file sizes of assets (by reading from your bundler's manifest output) to the `$CIRCLE_ARTIFACTS/thresh/asset-sizes.json` directory as an artifact for later reference.

<details>
  <summary>Example output:</summary>

```json
{
  "app.css": {
    "size": 52336,
    "path": "public/css/app.54bbcf6f50ed582c98f5cf3841d5c837.css"
  },
  "app.js": {
    "size": 408489,
    "path": "public/js/app.18db3f4eb6b95f3ac8ea.js"
  },
  "manifest.js": {
    "size": 1463,
    "path": "public/js/manifest.5cb70be29d3945c8ee59.js"
  },
  "vendor.js": {
    "size": 2284786,
    "path": "public/js/vendor.af1abaa45f10408b578e.js"
  }
}
```
</details>

- Posts failing commit status if there are any asset size threshold failures.

  **The following only happens if a pull request is associated with the Circle build:**

- Generates diff of base branch asset sizes with current branch.

- Saves file containing that diff information to `$CIRCLE_ARTIFACTS/thresh/asset-diffs.json`.

<details>
  <summary>Example output:</summary>

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
</details>
<br/>

- Posts that diff as a status to PR associated with the build (if any) to give you insight into how the patch affects asset sizes.

## Comparison to Other Offerings
| | [bundlesize](https://github.com/siddharthkp/bundlesize) | [buildsize](https://buildsize.org/) | [thresh](https://github.com/danny-andrews/thresh) |
| --- | :---: | :---: | :---: |
| Handles Fingerprinting? | Y | Y | Y |
| Posts PR Status Filesize Diffs? | Y | Y | Y |
| Relies on 3rd-party service? | Y | Y | N |
| CIs Supported | Travis CI, CircleCI, Wercker, and Drone | Circle CI | Circle CI, easy to add more |
| Configuration | Expose GitHub access token to environment | None | Expose GitHub/CircleCI access token to environment |

## CLI Options

### --config-path
- Description: Filepath to your bundler's manifest output.
- Type: `String`
- Default: `./.threshrc.toml`

## Configuation Values (in JSDoc Format)

- `{string} manifest-path` - Filepath to your bundler's manifest output.
- `{string} [output-directory]` - Directory where your assets are output.
- `{string} [project-name]` - The name of the project for which the asset stats will be generated. (Only use in monorepo situations where you may want to generate asset stats for multiple projects during the same build.) The asset size artifact will be scoped by project name and the CI status label (`Asset Sizes: [PROJECT_NAME]`) will be updated accordingly.
- `{string} [failure-thresholds]` - A list of configuration objects used to determine the conditions under which the [GitHub status](https://developer.github.com/v3/repos/statuses/#create-a-status) will be posted as "failed." The shape of this object is described [here](#failure-threshold-config-shape).
  - `{string} failureThresholds.maxSize`
  - `{string="any","total"} [failureThresholds.strategy="any"]` - How the threshold is applied. If set to "any", it will fail if any asset in the target set is above the threshold. If set to "total" it will fail if the total of all assets in the set is above the threshold.
  - `{(string|string[])} [failureThresholds.targets="all"]` - The target(s) of the threshold. Each target can be either a file extension (e.g. ".js" for all javascript assets), an asset path "vendor.js" for the "vendor.js" asset, or the special keyword "all" for all assets (default).

<details>
  <summary>Example config file:</summary>

```toml
manifest-path = "example/dist/manifest.json"

output-directory = "example/dist"

[[failure-thresholds]]
targets = ".js"
maxSize = 20000
strategy = "total"
```
This example would post a failed GitHub status if the total size of all javascript assets was larger than 20kB.
</details>

## Required Environment Variables

### [CircleCI Built-ins](https://circleci.com/docs/1.0/environment-variables/)
- `CIRCLE_ARTIFACTS`<sup>[2.0](#circleci-20-notes)</sup>
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

## Future Plans
I've tried to keep the CI environment-agnostic code (reading config, reading asset stats, calculating asset diffs, etc.) separate from the code specific to CircleCI (reading environment variables, storing build artifacts, retrieving build info, etc.) in an effort to ease development of similar integrations for other CI environments (Jenkins, Travis, etc.). I'll split this repo up accordingly when more integrations are made.

## Contributing
If you see something missing, please open an issue! This project is my real-world testbed for software design patterns or other ideas I want to play around with, so I plan to be very active in maintaining it in the foreseeable future.
