import { Mesh, type Object3D } from 'three';
import type { PlayerAppearance } from '../../game/types';
import { resolveBodyConstruction } from '../../game/content/bodyConstruction';
import { createCharacterRig2d } from './characterRig2d';

export function createPlayerMesh(appearance?: PlayerAppearance): ReturnType<typeof createCharacterRig2d> {
  return createCharacterRig2d(resolveBodyConstruction(appearance));
}

export function disposeIllustratedCharacter(object: Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    child.geometry.dispose();
    const material = child.material;
    const disposeMaterial = (entry: typeof material extends Array<infer U> ? U : typeof material): void => {
      if ('map' in entry && entry.map) {
        entry.map.dispose();
      }
      entry.dispose();
    };

    if (Array.isArray(material)) {
      material.forEach((entry) => disposeMaterial(entry));
    } else {
      disposeMaterial(material);
    }
  });
}
