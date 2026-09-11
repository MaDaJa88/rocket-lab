"use client";

export function SpaceEnvironment() {
  return (
    <>
      <color attach="background" args={["#9ad6fb"]} />
      <fog attach="fog" args={["#c9ecff", 88, 470]} />
      <ambientLight name="amb" intensity={0.84} />
      <hemisphereLight name="hemi" args={["#eaf7ff", "#6eac62", 1.08]} />
      <directionalLight
        name="sun"
        position={[48, 210, 90]}
        intensity={2.62}
        color="#fff6d8"
        castShadow={false}
      />
      <directionalLight name="fill" position={[-55, 120, -40]} intensity={0.62} color="#9ec5ff" />
    </>
  );
}
