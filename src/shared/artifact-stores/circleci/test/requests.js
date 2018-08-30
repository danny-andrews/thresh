import {PrResource, BuildResource, ArtifactResource} from './factories';

export const GetBaseBranchHandler = response => ({
  matcher: /repos\/.*\/pulls/,
  response: response || PrResource()
});

export const GetRecentBuildsHandler = response => ({
  matcher: /project\/github\/.*\/tree/,
  response: response || [BuildResource()]
});

export const GetArtifactsHandler = response => ({
  matcher: /project\/github\/.*\/artifacts/,
  response: response || [ArtifactResource()]
});

export const GetArtifactHandler = ({response, matcher}) => ({
  matcher,
  response: response || {}
});
