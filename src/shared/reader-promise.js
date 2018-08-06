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
  const mapErr = fn => ReaderPromise(
    value.map(
      promise => promise.catch(fn)
    )
  );
  const chainErr = fn => ReaderPromise(
    value.chain(
      promise => Reader(
        config => promise.catch(
          (...args) => fn(...args).run(config)
        )
      )
    )
  );

  return Object.freeze({
    chain,
    map,
    mapErr,
    chainErr,
    run: config => value.run(config)
  });
});

ReaderPromise.fromPromise = a => R.always(a) |> Reader |> ReaderPromise;

ReaderPromise.of = a => Promise.resolve(a) |> ReaderPromise.fromPromise;

ReaderPromise.fromError = a => Promise.reject(a) |> ReaderPromise.fromPromise;

ReaderPromise.fromReaderFn = a => Reader(a) |> ReaderPromise;

ReaderPromise.parallel = readerPromises => ReaderPromise.fromReaderFn(
  config => Promise.all(readerPromises.map(rp => rp.run(config)))
);

export default ReaderPromise;
