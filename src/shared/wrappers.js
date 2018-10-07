import FlatFileDb from 'flat-file-db';

export const Database = (...args) => {
  const flatFileDb = FlatFileDb(...args);

  return new Promise(
    resolve => flatFileDb.on('open', () => resolve(flatFileDb))
  );
};
