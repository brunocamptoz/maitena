import { redirect } from "next/navigation";

/** El panel arranca en Pedidos: /admin solo redirige (así sirven los accesos guardados y el ingreso). */
export default function AdminHome() {
  redirect("/admin/pedidos");
}
