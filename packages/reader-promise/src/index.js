import {Reader} from 'monet';
import R from 'ramda';

const CreateFactory = f => {
  const constructor = (...args) => ({...f(...args), constructor});

  return constructor;
};

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

ReaderPromise.fromReaderFn = a => Reader(a) |> ReaderPromise;

ReaderPromise.fromError = a => Promise.reject(a) |> ReaderPromise.fromPromise;

ReaderPromise.fromEither = a => a.cata(
  ReaderPromise.fromError,
  ReaderPromise.of
);

ReaderPromise.parallel = readerPromises => ReaderPromise.fromReaderFn(
  config => Promise.all(
    readerPromises.map(
      rp => rp.run(config)
    )
  )
);

export default ReaderPromise;
