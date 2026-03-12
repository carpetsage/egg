// Patch ArtifactsDB.decode in the generated proto/index.js to tolerate corrupt
// MissionInfo entries from the EI game server. Some mission_archive entries have
// a server-side buffer overrun that produces garbage bytes, causing the protobuf
// reader to throw. This wraps MissionInfo.decode calls in ArtifactsDB.decode
// with try/catch so corrupt entries are skipped and the rest of the backup can
// still be decoded.

import { readFileSync, writeFileSync } from 'fs';

const file = new URL('./index.js', import.meta.url);
let src = readFileSync(file, 'utf8');

// In ArtifactsDB.decode, the generated code for MissionInfo sub-messages is:
//   $root.ei.MissionInfo.decode(reader, reader.uint32())
// We need to save the sub-message end position before decoding, then wrap the
// decode in try/catch so on error we skip to the end of that sub-message.
//
// Replace patterns like:
//   message.fuelingMission = $root.ei.MissionInfo.decode(reader, reader.uint32());
//   message.missionInfos.push($root.ei.MissionInfo.decode(reader, reader.uint32()));
//   message.missionArchive.push($root.ei.MissionInfo.decode(reader, reader.uint32()));

const replacements = [
  {
    from: 'message.fuelingMission = $root.ei.MissionInfo.decode(reader, reader.uint32());',
    to: `let fmEnd = reader.uint32() + reader.pos;
                        try {
                            message.fuelingMission = $root.ei.MissionInfo.decode(reader, fmEnd - reader.pos);
                        } catch (_) {
                            reader.pos = fmEnd;
                        }`,
  },
  {
    from: 'message.missionInfos.push($root.ei.MissionInfo.decode(reader, reader.uint32()));',
    to: `let miEnd = reader.uint32() + reader.pos;
                        try {
                            message.missionInfos.push($root.ei.MissionInfo.decode(reader, miEnd - reader.pos));
                        } catch (_) {
                            reader.pos = miEnd;
                        }`,
  },
  {
    from: 'message.missionArchive.push($root.ei.MissionInfo.decode(reader, reader.uint32()));',
    to: `let maEnd = reader.uint32() + reader.pos;
                        try {
                            message.missionArchive.push($root.ei.MissionInfo.decode(reader, maEnd - reader.pos));
                        } catch (_) {
                            reader.pos = maEnd;
                        }`,
  },
];

let patched = 0;
for (const { from, to } of replacements) {
  if (src.includes(from)) {
    src = src.replaceAll(from, to);
    patched++;
  }
}

writeFileSync(file, src);
console.log(`Patched ArtifactsDB.decode: ${patched} MissionInfo call site(s) wrapped with try/catch`);
