import CanvasPage from "@/pages/canvas/CanvasPage";
import { plazaSessionSourceApi } from "@/features/gameplay/session/api/session-source.api";

export default function PlazaPage() {
  return <CanvasPage sessionSourceApi={plazaSessionSourceApi} />;
}
