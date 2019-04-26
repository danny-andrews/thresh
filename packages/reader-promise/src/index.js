import {Reader} from 'monet';
import R from 'ramda';
import {CreateFactory} from '@danny.andrews/fp-utils';

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
          a => fn(a).run(config)
        )
      )
    )
  );

  const mapErr = fn => ReaderPromise(
    value.map(
      promise => promise.catch(
        err => Promise.reject(
          fn(err)
        )
      )
    )
  );

  const chainErr = fn => ReaderPromise(
    value.chain(
      promise => Reader(
        config => promise.catch(
          err => fn(err).run(config)
        )
      )
    )
  );

  const run = config => value.run(config);

  return Object.freeze({map, chain, mapErr, chainErr, run});
});

ReaderPromise.of = a => Promise.resolve(a) |> ReaderPromise.fromPromise;

ReaderPromise.fromPromise = a => R.always(a) |> Reader |> ReaderPromise;

ReaderPromise.asks = fn => Reader(fn) |> ReaderPromise;

ReaderPromise.fromError = e => Promise.reject(e) |> ReaderPromise.fromPromise;

ReaderPromise.fromEither = either => either.cata(
  ReaderPromise.fromError,
  ReaderPromise.of
);

ReaderPromise.parallel = readerPromises => ReaderPromise.asks(
  config => Promise.all(
    readerPromises.map(
      readerPromise => readerPromise.run(config)
    )
  )
);

ReaderPromise.invokeAt = R.curry(
  (transform, select) => (...args) => ReaderPromise.asks(
    config => transform(
      select(config)(...args),
      config
    )
  )
);

export default ReaderPromise;
