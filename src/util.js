import {is} from 'ramda';

export const fmtSigned = number => {
  const string = is(Number, number) ? number.toString() : number;

  return number > 0 ? `+${string}` : string;
};

export const fmtPercent = number => `${number}%`;
