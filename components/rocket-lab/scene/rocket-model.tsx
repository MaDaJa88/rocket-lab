"use client";

import { DoubleSide } from "three";

import { getPaint } from "@/lib/rocket-lab/parts";
import type { RocketDesign } from "@/lib/rocket-lab/types";

export function RocketModel({
  design,
  engineOn = false,
}: {
  design: RocketDesign;
  engineOn?: boolean;
}) {
  const paint = getPaint(design.paint);
  const dims = dimensions(design);

  return (
    <group>
      <group position={[0, dims.engine, 0]}>
        <EngineShape id={design.engine} on={engineOn} />
      </group>
      <group position={[0, dims.engine + dims.body / 2, 0]}>
        <BodyShape
          id={design.body}
          color={paint.hex}
          stripe={paint.stripe}
          height={dims.body}
        />
        <FinShape id={design.fins} radius={dims.radius} color={paint.stripe} />
      </group>
      <group position={[0, dims.engine + dims.body + dims.nose / 2, 0]}>
        <NoseShape
          id={design.nose}
          color={paint.hex}
          stripe={paint.stripe}
          height={dims.nose}
          radius={dims.radius}
        />
      </group>
      {engineOn ? <Exhaust design={design} radius={dims.radius} y={0.02} /> : null}
    </group>
  );
}

function dimensions(design: RocketDesign) {
  const body =
    design.body === "slim"
      ? 1.15
      : design.body === "chubby"
        ? 1.05
        : design.body === "crate"
          ? 0.95
          : design.body === "starship"
            ? 1.32
            : design.body === "glider"
              ? 1.12
              : design.body === "orb"
                ? 0.92
                : 1.22;
  const nose =
    design.nose === "saucer"
      ? 0.22
      : design.nose === "cube"
        ? 0.38
        : design.nose === "dome"
          ? 0.42
          : design.nose === "shuttle"
            ? 0.5
            : design.nose === "spike"
              ? 0.72
              : design.nose === "hammer"
                ? 0.34
                : 0.55;
  const engine =
    design.engine === "thunder" ||
    design.engine === "pulse" ||
    design.engine === "torch" ||
    design.engine === "photon"
      ? 0.4
      : design.engine === "cluster"
        ? 0.3
        : design.engine === "ion"
          ? 0.24
          : design.engine === "sparkler"
            ? 0.26
            : 0.32;
  const radius =
    design.body === "slim"
      ? 0.16
      : design.body === "chubby" || design.body === "starship"
        ? 0.32
        : design.body === "crate"
          ? 0.3
          : design.body === "glider"
            ? 0.2
            : design.body === "orb"
              ? 0.38
              : 0.22;
  return { body, nose, engine, radius };
}

function BodyShape({
  id,
  color,
  stripe,
  height,
}: {
  id: RocketDesign["body"];
  color: string;
  stripe: string;
  height: number;
}) {
  if (id === "crate") {
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.58, height, 0.58]} />
          <meshStandardMaterial color={color} metalness={0.18} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.08, 0.3]}>
          <boxGeometry args={[0.42, 0.18, 0.04]} />
          <meshStandardMaterial color={stripe} />
        </mesh>
      </group>
    );
  }
  if (id === "orb") {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[0.46, 28, 20]} />
          <meshStandardMaterial color={color} metalness={0.28} roughness={0.32} />
        </mesh>
        {[0.18, -0.12].map((y) => (
          <mesh key={y} position={[0.28, y, 0.22]}>
            <sphereGeometry args={[0.08, 12, 10]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#38bdf8"
              emissiveIntensity={0.7}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.48, 0.035, 8, 28]} />
          <meshStandardMaterial color={stripe} metalness={0.4} roughness={0.3} />
        </mesh>
      </group>
    );
  }
  if (id === "glider") {
    return (
      <group>
        <mesh scale={[1.55, 1, 0.42]}>
          <cylinderGeometry args={[0.22, 0.26, height, 20]} />
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0.12]}>
          <sphereGeometry args={[0.12, 14, 10]} />
          <meshStandardMaterial color="#bae6fd" metalness={0.3} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <boxGeometry args={[0.08, height * 0.7, 0.02]} />
          <meshStandardMaterial color={stripe} />
        </mesh>
      </group>
    );
  }
  if (id === "starship") {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.3, 0.34, height, 24]} />
          <meshStandardMaterial color={color} metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.305, 0.305, 0.1, 24]} />
          <meshStandardMaterial color={stripe} metalness={0.2} roughness={0.4} />
        </mesh>
        {[-0.28, -0.08, 0.12, 0.32].map((y) => (
          <mesh key={y} position={[0, y, 0.3]}>
            <boxGeometry args={[0.38, 0.14, 0.04]} />
            <meshStandardMaterial color="#1c1917" roughness={0.7} />
          </mesh>
        ))}
      </group>
    );
  }
  const r = id === "slim" ? 0.16 : id === "chubby" ? 0.32 : 0.22;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[r, r * 1.05, height, 24]} />
        <meshStandardMaterial color={color} metalness={0.22} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[r * 1.02, r * 1.02, 0.12, 24]} />
        <meshStandardMaterial color={stripe} metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh position={[0.12, 0.28, r * 0.72]}>
        <boxGeometry args={[0.16, 0.1, 0.03]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function NoseShape({
  id,
  color,
  stripe,
  height,
  radius,
}: {
  id: RocketDesign["nose"];
  color: string;
  stripe: string;
  height: number;
  radius: number;
}) {
  if (id === "cube") {
    return (
      <mesh>
        <boxGeometry args={[radius * 2.1, height, radius * 2.1]} />
        <meshStandardMaterial color={color} metalness={0.12} roughness={0.5} />
      </mesh>
    );
  }
  if (id === "hammer") {
    return (
      <group>
        <mesh position={[0, height * 0.15, 0]}>
          <boxGeometry args={[radius * 2.8, height * 0.55, radius * 1.15]} />
          <meshStandardMaterial color={color} metalness={0.15} roughness={0.48} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[radius * 0.7, radius * 0.55, height * 0.7, 12]} />
          <meshStandardMaterial color={stripe} metalness={0.2} roughness={0.4} />
        </mesh>
      </group>
    );
  }
  if (id === "saucer") {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[radius * 1.85, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={stripe} metalness={0.35} roughness={0.28} />
        </mesh>
        <mesh scale={[1, 0.22, 1]} position={[0, -0.02, 0]}>
          <sphereGeometry args={[radius * 2.3, 28, 16]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.32} />
        </mesh>
      </group>
    );
  }
  if (id === "dome") {
    return (
      <mesh position={[0, height * 0.05, 0]}>
        <sphereGeometry args={[radius * 1.05, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.25]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.35} />
      </mesh>
    );
  }
  if (id === "shuttle") {
    return (
      <group>
        <mesh scale={[1.45, 1, 0.55]} rotation={[0.12, 0, 0]}>
          <coneGeometry args={[radius * 1.15, height, 16]} />
          <meshStandardMaterial color={color} metalness={0.22} roughness={0.34} />
        </mesh>
        <mesh position={[0, -0.04, 0.08]}>
          <boxGeometry args={[0.08, 0.12, 0.06]} />
          <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.4} />
        </mesh>
      </group>
    );
  }
  if (id === "spike") {
    return (
      <group>
        <mesh>
          <coneGeometry args={[radius * 0.92, height, 18]} />
          <meshStandardMaterial color={color} metalness={0.45} roughness={0.22} />
        </mesh>
        <mesh position={[0, -height * 0.22, 0]}>
          <cylinderGeometry args={[radius * 0.95, radius * 1.02, 0.08, 18]} />
          <meshStandardMaterial color={stripe} metalness={0.2} roughness={0.4} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh>
      <coneGeometry args={[radius * 1.05, height, 20]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.32} />
    </mesh>
  );
}

function FinShape({
  id,
  radius,
  color,
}: {
  id: RocketDesign["fins"];
  radius: number;
  color: string;
}) {
  if (id === "none") return null;
  if (id === "ringfin") {
    return (
      <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius + 0.16, 0.045, 8, 28]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.32} />
      </mesh>
    );
  }
  if (id === "grid") {
    const fins = [];
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      fins.push(
        <group
          key={i}
          position={[Math.cos(a) * (radius + 0.16), -0.22, Math.sin(a) * (radius + 0.16)]}
          rotation={[0, -a, 0.08]}
        >
          <mesh>
            <boxGeometry args={[0.28, 0.32, 0.03]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.45} roughness={0.28} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.2, 0.24, 0.04]} />
            <meshStandardMaterial color="#0f172a" roughness={0.6} />
          </mesh>
        </group>,
      );
    }
    return <group>{fins}</group>;
  }
  if (id === "petal") {
    const fins = [];
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      fins.push(
        <mesh
          key={i}
          position={[Math.cos(a) * (radius + 0.22), -0.05, Math.sin(a) * (radius + 0.22)]}
          rotation={[0.55, -a, 0]}
        >
          <boxGeometry args={[0.18, 0.55, 0.02]} />
          <meshStandardMaterial
            color="#f5d0fe"
            emissive="#e879f9"
            emissiveIntensity={0.25}
            metalness={0.2}
            roughness={0.35}
          />
        </mesh>,
      );
    }
    return <group>{fins}</group>;
  }
  const count = id === "wings" ? 2 : 4;
  const span = id === "wings" ? 0.72 : id === "stubs" ? 0.22 : 0.36;
  const height = id === "wings" ? 0.18 : id === "stubs" ? 0.22 : 0.42;
  const thick = id === "wings" ? 0.045 : 0.05;
  const fins = [];
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + (id === "wings" ? Math.PI / 2 : 0);
    fins.push(
      <mesh
        key={i}
        position={[
          Math.cos(a) * (radius + span / 2),
          -0.28,
          Math.sin(a) * (radius + span / 2),
        ]}
        rotation={[0, -a, 0.12]}
      >
        <boxGeometry args={[span, height, thick]} />
        <meshStandardMaterial
          color={id === "wings" ? "#93c5fd" : color}
          metalness={0.15}
          roughness={0.4}
        />
      </mesh>,
    );
  }
  return <group>{fins}</group>;
}

function EngineShape({ id, on }: { id: RocketDesign["engine"]; on: boolean }) {
  if (id === "cluster") {
    const bells = [];
    bells.push(<Bell key="c" x={0} z={0} s={0.72} on={on} />);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      bells.push(<Bell key={i} x={Math.cos(a) * 0.16} z={Math.sin(a) * 0.16} s={0.58} on={on} />);
    }
    return <group position={[0, -0.12, 0]}>{bells}</group>;
  }
  if (id === "ion") {
    return (
      <group position={[0, -0.16, 0]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.12, 0.16, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.035, 8, 20]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={on ? 2.2 : 0.4}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
      </group>
    );
  }
  if (id === "pulse") {
    return (
      <group scale={1.2} position={[0, -0.18, 0]}>
        <mesh>
          <cylinderGeometry args={[0.14, 0.22, 0.24, 16]} />
          <meshStandardMaterial color="#3b0764" metalness={0.5} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.24, 0.32, 16, 1, true]} />
          <meshStandardMaterial
            color="#1f2937"
            emissive={on ? "#e879f9" : "#111111"}
            emissiveIntensity={on ? 1.8 : 0.1}
            metalness={0.4}
            roughness={0.35}
            side={DoubleSide}
          />
        </mesh>
      </group>
    );
  }
  if (id === "torch") {
    return (
      <group scale={1.15} position={[0, -0.18, 0]}>
        <mesh>
          <cylinderGeometry args={[0.13, 0.2, 0.22, 16]} />
          <meshStandardMaterial color="#d6d3d1" metalness={0.7} roughness={0.22} />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.3, 16, 1, true]} />
          <meshStandardMaterial
            color="#1c1917"
            emissive={on ? "#fde68a" : "#111111"}
            emissiveIntensity={on ? 2.1 : 0.12}
            metalness={0.45}
            roughness={0.3}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.025, 8, 18]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={on ? 1.6 : 0.3}
          />
        </mesh>
      </group>
    );
  }
  if (id === "photon") {
    return (
      <group scale={1.05} position={[0, -0.16, 0]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.14, 0.18, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.14} />
        </mesh>
        <mesh position={[0, -0.16, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.16, 0.26, 16, 1, true]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive={on ? "#e0f2fe" : "#111111"}
            emissiveIntensity={on ? 2.4 : 0.15}
            metalness={0.5}
            roughness={0.22}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.02, 8, 24]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#38bdf8"
            emissiveIntensity={on ? 2 : 0.35}
          />
        </mesh>
      </group>
    );
  }
  const scale = id === "thunder" ? 1.25 : id === "sparkler" ? 0.72 : 1;
  return (
    <group scale={scale} position={[0, -0.18, 0]}>
      <mesh>
        <cylinderGeometry args={[0.12, 0.18, 0.22, 16]} />
        <meshStandardMaterial color="#4b5563" metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.18, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.2, 0.28, 16, 1, true]} />
        <meshStandardMaterial
          color="#1f2937"
          emissive={on ? "#fb923c" : "#111111"}
          emissiveIntensity={on ? 1.4 : 0.1}
          metalness={0.4}
          roughness={0.35}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Bell({ x, z, s, on }: { x: number; z: number; s: number; on: boolean }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.12, 0.16, 10]} />
        <meshStandardMaterial color="#4b5563" metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.13, 0.18, 10, 1, true]} />
        <meshStandardMaterial
          color="#1f2937"
          emissive={on ? "#fb923c" : "#111111"}
          emissiveIntensity={on ? 1.2 : 0.1}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Exhaust({
  design,
  radius,
  y,
}: {
  design: RocketDesign;
  radius: number;
  y: number;
}) {
  if (design.engine === "ion") {
    return (
      <group position={[0, y, 0]} rotation={[Math.PI, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.16, 0.85, 12]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.7} />
        </mesh>
        <pointLight color="#67e8f9" intensity={6} distance={10} />
      </group>
    );
  }
  if (design.engine === "photon") {
    return (
      <group position={[0, y, 0]} rotation={[Math.PI, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.12, 1.35, 12]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.85} />
        </mesh>
        <pointLight color="#7dd3fc" intensity={9} distance={16} />
      </group>
    );
  }
  if (design.engine === "cluster") {
    const flames = [<Flame key="c" x={0} z={0} radius={radius * 0.35} />];
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      flames.push(
        <Flame key={i} x={Math.cos(a) * 0.16} z={Math.sin(a) * 0.16} radius={radius * 0.28} />,
      );
    }
    return (
      <group position={[0, y - 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        {flames}
        <pointLight color="#ff9d4a" intensity={9} distance={14} />
      </group>
    );
  }
  const fat = design.engine === "thunder" || design.engine === "pulse" || design.engine === "torch";
  const hot =
    design.engine === "pulse" ? "#e879f9" : design.engine === "torch" ? "#fde68a" : "#ffb36b";
  const core = design.engine === "pulse" ? "#fdf4ff" : "#fff7ed";
  return (
    <group position={[0, y, 0]} rotation={[Math.PI, 0, 0]}>
      <mesh scale={[fat ? 1.3 : 1, 1, fat ? 1.3 : 1]}>
        <coneGeometry args={[radius * 0.7, 0.7, 12]} />
        <meshBasicMaterial color={hot} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.35, 0]} scale={[0.55, 1.15, 0.55]}>
        <coneGeometry args={[radius * 0.55, 0.7, 10]} />
        <meshBasicMaterial color={core} transparent opacity={0.9} />
      </mesh>
      <pointLight
        color={design.engine === "pulse" ? "#e879f9" : design.engine === "torch" ? "#fbbf24" : "#ff9d4a"}
        intensity={fat ? 8 : 5}
        distance={12}
      />
    </group>
  );
}

function Flame({ x, z, radius }: { x: number; z: number; radius: number }) {
  return (
    <mesh position={[x, 0, z]}>
      <coneGeometry args={[radius, 0.48, 8]} />
      <meshBasicMaterial color="#ffb36b" transparent opacity={0.8} />
    </mesh>
  );
}
