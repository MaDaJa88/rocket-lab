import type { Metadata } from "next";
import { Fredoka } from "next/font/google";

import { RocketLabApp } from "@/components/rocket-lab/rocket-lab-app";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rocket Lab — Build, launch, orbit",
  description:
    "A kid-friendly 3D rocket workshop. Choose shapes, launch, and learn why good designs reach orbit while silly ones crash.",
};

export default function Home() {
  return (
    <div className={`${fredoka.variable} h-dvh min-h-dvh`}>
      <RocketLabApp />
    </div>
  );
}
