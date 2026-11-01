import { useBridge } from "./hooks/useBridge";
import { IslandScene } from "./scene/IslandScene";

export function App() {
  const bridge = useBridge();

  return (
    <IslandScene
      agents={bridge.agents}
      status={bridge.status}
      actions={bridge.actions}
      connected={bridge.connected}
      error={bridge.error}
    />
  );
}
