/**
 * Artifact Set types and payloads.
 */

export type ArtifactSetName = 'earnings' | 'elr';

/**
 * Artifact slot in a loadout (serializable).
 */
export interface ArtifactSlotPayload {
    artifactId: string | null;
    stones: (string | null)[];
}

/**
 * Payload for changing artifact loadout.
 */
export interface ChangeArtifactsPayload {
    fromLoadout: ArtifactSlotPayload[];
    toLoadout: ArtifactSlotPayload[];
}

/**
 * Payload for equipping an artifact set.
 */
export interface EquipArtifactSetPayload {
    setName: ArtifactSetName;
}

/**
 * Payload for updating an artifact set.
 */
export interface UpdateArtifactSetPayload {
    setName: ArtifactSetName;
    newLoadout: ArtifactSlotPayload[];
}
