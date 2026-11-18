# 3D avatar models

Drop a `.vrm` (recommended) or `.glb` file here, e.g. `atlas.vrm`, then in
Avatar studio > 3D tab set the model URL to `/models/atlas.vrm`.

VRM models get blinking, look-at-pointer and lip-sync (the `aa` expression).
GLB models get idle motion and head look-at only. Without a model a procedural
placeholder head is shown. See `src/components/avatar/Stage3D.tsx`.
