declare module 'react-native-config' {
  export interface NativeConfig {
    ORS_API_KEY?: string;
  }
  const Config: NativeConfig;
  export default Config;
}

declare module '@sayem314/react-native-keep-awake' {
  export function useKeepAwake(): void;
}
