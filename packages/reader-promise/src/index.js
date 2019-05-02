import {Reader} from 'monet';
import R from 'ramda';
import {CreateFactory} from '@danny.andrews/fp-utils';

const ReaderPromise = CreateFactory(value => {
  const map = fn => ReaderPromise(
    value.map(
      promise => promise.then(fn)
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

  const chain = fn => ReaderPromise(
    value.chain(
      promise => Reader(
        config => promise.then(
          a => fn(a).run(config)
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

  const local = fn => ReaderPromise(
    Reader(
      config => value.run(
        fn(config)
      )
    )
  );

  return Object.freeze({map, mapErr, chain, chainErr, run, local});
});

ReaderPromise.of = a => Promise.resolve(a) |> ReaderPromise.fromPromise;

ReaderPromise.asks = fn => Reader(fn) |> ReaderPromise;

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

ReaderPromise.fromError = e => Promise.reject(e) |> ReaderPromise.fromPromise;

ReaderPromise.fromEither = either => either.cata(
  ReaderPromise.fromError,
  ReaderPromise.of
);

ReaderPromise.fromPromise = a => R.always(a) |> Reader |> ReaderPromise;

export default ReaderPromise;
