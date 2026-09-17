import type {CodeType} from '../packages/discount-card';

export type RootStackParamList = {
  Home: {message?: string} | undefined;
  Card: {id: string};
  CardForm:
    | {
        id?: string;
        scannedCode?: string;
        scannedType?: CodeType;
      }
    | undefined;
  Scanner: {cardId?: string};
};
