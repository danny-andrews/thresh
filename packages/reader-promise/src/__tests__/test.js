import test from 'ava';
import expect from 'expect';
import R from 'ramda';
import {Either} from 'monet';

import ReaderPromise from '..';

test('"chain" obeys monad left identity law', () => {
  const value = 4;
  const f = x => ReaderPromise.of(x * 3);

  return Promise.all([
    ReaderPromise.of(value).chain(f).run(),
    f(value).run()
  ]).then(([actual, expected]) => {
    expect(actual).toBe(expected);
  });
});

test('"chain" obeys monad right identity law', () => {
  const readerPromise = ReaderPromise.of(5);

  return Promise.all([
    readerPromise.chain(ReaderPromise.of).run(),
    readerPromise.run()
  ]).then(([actual, expected]) => {
    expect(actual).toBe(expected);
  });
});

test('"chain" obeys monad associativity law', () => {
  const readerPromise = ReaderPromise.of(3);
  const f = x => ReaderPromise.of(x * 2);
  const g = x => ReaderPromise.of(x + 3);

  return Promise.all([
    readerPromise.chain(f).chain(g).run(),
    readerPromise.chain(x => f(x).chain(g)).run()
  ]).then(([actual, expected]) => {
    expect(actual).toBe(expected);
  });
});

test('"map" obeys functor identity law', () => {
  const readerPromise = ReaderPromise.of(1);

  return Promise.all([
    readerPromise.map(R.identity).run(),
    readerPromise.run()
  ]).then(([actual, expected]) => {
    expect(actual).toBe(expected);
  });
});

test('"map" obeys functor composition law', () => {
  const readerPromise = ReaderPromise.of(2);
  const f = x => x * 2;
  const g = x => x + 3;

  return Promise.all([
    readerPromise.map(x => g(f(x))).run(),
    readerPromise.map(f).map(g).run()
  ]).then(([actual, expected]) => {
    expect(actual).toBe(expected);
  });
});

test('"chainErr" obeys monad left identity law', () => {
  const value = 4;
  const f = x => ReaderPromise.fromError(x * 3);

  return ReaderPromise.fromError(value)
    .chainErr(f)
    .run()
    .catch(
      actual => f(value).run().catch(expected => {
        expect(actual).toBe(expected);
      })
    );
});

test('"chainErr" obeys monad right identity law', () => {
  const readerPromise = ReaderPromise.fromError(5);

  return readerPromise.chain(ReaderPromise.fromError).run().catch(
    actual => readerPromise.run().catch(expected => {
      expect(actual).toBe(expected);
    })
  );
});

test('"chainErr" obeys monad associativity law', () => {
  const readerPromise = ReaderPromise.of(3);
  const f = x => ReaderPromise.fromError(x * 2);
  const g = x => ReaderPromise.fromError(x + 3);

  return readerPromise.chain(f)
    .chain(g)
    .run()
    .catch(
      actual => readerPromise.chain(x => f(x).chain(g))
        .run()
        .catch(expected => {
          expect(actual).toBe(expected);
        })
    );
});

test('"mapErr" obeys functor identity law', () => {
  const readerPromise = ReaderPromise.fromError(1);

  return readerPromise.map(R.identity)
    .run()
    .catch(
      actual => readerPromise.run().catch(expected => {
        expect(actual).toBe(expected);
      })
    );
});

test('"mapErr" obeys functor composition law', () => {
  const readerPromise = ReaderPromise.fromError(2);
  const f = x => x * 2;
  const g = x => x + 3;

  return readerPromise.map(x => g(f(x)))
    .run()
    .catch(
      actual => readerPromise.map(f)
        .map(g)
        .run()
        .catch(expected => {
          expect(actual).toBe(expected);
        })
    );
});

test(
  '"fromPromise" creates a ReaderPromise from a resolved promise',
  () => ReaderPromise.fromPromise(Promise.resolve(5))
    .map(x => x * 2)
    .run()
    .then(actual => {
      expect(actual).toBe(10);
    })
);

test(
  '"fromPromise" creates a ReaderPromise from a rejected promise',
  // eslint-disable-next-line prefer-promise-reject-errors
  () => ReaderPromise.fromPromise(Promise.reject(5))
    .mapErr(x => x * 2)
    .run()
    .catch(actual => {
      expect(actual).toBe(10);
    })
);

test(
  '"fromReaderFn" creates a ReaderPromise from a reader function',
  // eslint-disable-next-line prefer-promise-reject-errors
  () => ReaderPromise.fromReaderFn(({getEnvVar}) => getEnvVar('GIT_BRANCH'))
    .map(x => x.toUpperCase())
    .run({getEnvVar: () => Promise.resolve('master')})
    .then(actual => {
      expect(actual).toBe('MASTER');
    })
);

test(
  '"fromEither" creates successful ReaderPromise from Right Either',
  () => ReaderPromise.fromEither(Either.Right(3)).run().then(actual => {
    expect(actual).toBe(3);
  })
);

test(
  '"fromEither" creates failed ReaderPromise from Left Either',
  () => ReaderPromise.fromEither(Either.Left('stuff')).run().catch(actual => {
    expect(actual).toBe('stuff');
  })
);

test(
  '"parallel" creates a ReaderPromise from a list of promises',
  () => ReaderPromise.parallel([ReaderPromise.of(5), ReaderPromise.of(12)])
    .run()
    .then(actual => {
      expect(actual).toEqual([5, 12]);
    })
);
