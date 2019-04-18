import R from 'ramda';

import {makeGitHubRequest} from './base';

export default pullRequestId => makeGitHubRequest(`pulls/${pullRequestId}`)
  .map(R.path(['base', 'ref']));
