import test from 'ava';
import expect from 'expect';
import saveStats from '../save-stats';

const FakeDb = initialData => {
  let data = initialData;

  return Promise.resolve({
    get: key => data[key],
    put: (key, newData) => {
      data = {...data, [key]: newData};
    }
  });
};

const subject = ({
  db = FakeDb(),
  stats = {}
} = {}) => saveStats(stats).run({db});

test('combines given stats with existing', () => {
  const fakeDb = FakeDb({
    'asset-stats': {
      project1: {
        'app.js': {
          size: 234,
          path: 'dist/app.js'
        }
      }
    }
  });

  return subject({
    db: fakeDb,
    stats: {
      project2: {
        'vendor.js': {
          size: 9272,
          path: 'dist/vendor.js'
        }
      }
    }
  }).then(contents => {
    const expected = {
      project1: {
        'app.js': {
          size: 234,
          path: 'dist/app.js'
        }
      },
      project2: {
        'vendor.js': {
          size: 9272,
          path: 'dist/vendor.js'
        }
      }
    };
    expect(contents).toEqual(expected);

    return fakeDb.then(conn => {
      expect(conn.get('asset-stats')).toEqual(expected);
    });
  });
});

test('handles no existing stats case', () => {
  const fakeDb = FakeDb({});

  return subject({
    db: fakeDb,
    stats: {
      project2: {
        'vendor.js': {
          size: 9272,
          path: 'dist/vendor.js'
        }
      }
    }
  }).then(contents => {
    const expected = {
      project2: {
        'vendor.js': {
          size: 9272,
          path: 'dist/vendor.js'
        }
      }
    };
    expect(contents).toEqual(expected);

    return fakeDb.then(conn => {
      expect(conn.get('asset-stats')).toEqual(expected);
    });
  });
});
