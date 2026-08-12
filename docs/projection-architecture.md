# Projection Architecture

Projection mode is available now as a clean visual 3D output preset with:

- Separate projection camera presets.
- Label toggle.
- Route toggle.
- Zone status color toggle.
- Projection camera reset.
- Local persistence through the main store.

Operator side panels are hidden in projection mode. This output is not a calibrated projection system.

## Governing Standard

Future physical projection must conform to
`docs/standards/physical-digital-twin-standard-v1.0.md`. Product models and
prices are maintained separately in
`docs/standards/approved-equipment-list.md`. Every event must create a frozen
deployment configuration from
`docs/standards/physical-deployment-profile-template.md`.

The standard fixes the versioned platform-to-gateway contract, identity,
coordinate conversion, calibration provenance, failure behavior, acceptance
tests, and delivery pack. It deliberately does not hardcode a projector brand,
throw ratio, brightness value, or projector count before a room-specific
Projection Study.

## Future Calibration

Advanced projection calibration is not implemented yet and is not exposed as fake controls.

Future architecture is represented by `src/three/projection/calibrationTypes.ts`:

- Warp configuration.
- Mask polygons.
- Keystone corners.
- Multi-projector output viewports.
- Saved calibration profiles.

The next implementation should add a calibration editor only after projector measurements and physical output requirements are known.

The future contract must also bind each calibration profile to model hashes,
physical revision, projector serial numbers, mount identity, adapter version,
operator, reviewer, and acceptance result. A version mismatch must block
operational projection and permit only a clearly labelled maintenance mode.
