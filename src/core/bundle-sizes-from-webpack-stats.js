import R from 'ramda';
import {extname} from 'path';
import {FilepathNotFoundInStatsErr} from './errors';

const flattenChunkAssets = ({chunkName, filepaths}) =>
  R.reduce(
    (acc, filepath) => ({
      ...acc,
      [chunkName + extname(filepath)]: filepath
    }),
    {},
    [].concat(filepaths)
  );

const assetsByFilename = webpackStats =>
  R.pipe(
    R.toPairs,
    R.reduce(
      (acc, [chunkName, filepaths]) => ({
        ...acc,
        ...flattenChunkAssets({chunkName, filepaths})
      }),
      {}
    )
  )(webpackStats.assetsByChunkName);

export default webpackStats => {
  const assetStatsByFilepath = R.reduce(
    (acc, {name, ...rest}) => ({...acc, [name]: rest}),
    {},
    webpackStats.assets
  );
  const assetPathMap = assetsByFilename(webpackStats);
  const errors = R.pipe(
    R.values,
    R.chain(filepath => (
      R.hasIn(filepath, assetStatsByFilepath)
        ? []
        : FilepathNotFoundInStatsErr(filepath)
    ))
  )(assetPathMap);
  if(!R.isEmpty(errors)) return errors;

  return R.map(
    filepath => ({size: assetStatsByFilepath[filepath].size, path: filepath}),
    assetPathMap
  );
};
