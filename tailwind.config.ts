import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: {extend: {colors: {gold: "#ffbe29", ink: "#110b0c", cream: "#fff8ed"}}}, plugins: [] } satisfies Config;
