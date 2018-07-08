import {Reader} from 'monet';
import R from 'ramda';
import {CreateFactory} from './util';

const ReaderPromise = CreateFactory(value => {
  const map = fn => ReaderPromise(
    value.map(
      promise => promise.then(fn)
    )
  );
  const chain = fn => ReaderPromise(
    value.chain(
      promise => Reader(
        config => promise.then(
          (...args) => fn(...args).run(config)
        )
      )
    )
  );

  return Object.freeze({
    chain,
    map,
    run: config => value.run(config)
  });
});

ReaderPromise.fromPromise = R.pipe(
  promise => () => promise,
  Reader,
  ReaderPromise
);

ReaderPromise.of = R.pipe(
  a => Promise.resolve(a),
  ReaderPromise.fromPromise,
);

ReaderPromise.fromError = R.pipe(
  a => Promise.reject(a),
  ReaderPromise.fromPromise,
);

ReaderPromise.fromReaderFn = R.pipe(
  Reader,
  ReaderPromise
);

export default ReaderPromise;
