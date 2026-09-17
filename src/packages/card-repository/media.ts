import ReactNativeBlobUtil from 'react-native-blob-util';
import {createUuid} from '../discount-card/uuid';

const MEDIA_DIRECTORY = 'media';

function documentDirectory(): string {
  return ReactNativeBlobUtil.fs.dirs.DocumentDir;
}

export function absolutePhotoPath(relativePath: string): string {
  return `${documentDirectory()}/${relativePath}`;
}

export async function importCardPhoto(
  sourceUri: string,
  extension = 'jpg',
): Promise<string> {
  const directory = `${documentDirectory()}/${MEDIA_DIRECTORY}`;
  await ReactNativeBlobUtil.fs.mkdir(directory);
  const relativePath = `${MEDIA_DIRECTORY}/${createUuid()}.${extension}`;
  const sourcePath = decodeURIComponent(sourceUri.replace(/^file:\/\//, ''));
  await ReactNativeBlobUtil.fs.cp(
    sourcePath,
    absolutePhotoPath(relativePath),
  );
  return relativePath;
}

export async function deleteCardPhoto(
  relativePath: string,
): Promise<void> {
  const path = absolutePhotoPath(relativePath);
  if (await ReactNativeBlobUtil.fs.exists(path)) {
    await ReactNativeBlobUtil.fs.unlink(path);
  }
}

export async function deleteCardPhotos(
  relativePaths: readonly string[],
): Promise<void> {
  await Promise.all(relativePaths.map(deleteCardPhoto));
}
