import Link from "next/link";
import { UtpInspectionForm } from "@/components/forms/utp-inspection-form";
import { getAllOwners } from "@/lib/services/owner";
import { getAllVehicles } from "@/lib/services/vehicle";

export default async function NewUtpPage() {
  const [owners, vehicles] = await Promise.all([
    getAllOwners(),
    getAllVehicles(),
  ]);

  return (
    <div className="space-y-4 mx-auto max-w-6xl">
      {/* Breadcrumb */}
      <nav>
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/utp" className="hover:text-gray-700 transition-colors">
              UTP
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">Nueva</li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva Inspección UTP</h1>
        <p className="text-muted-foreground mt-1">
          Inspección técnica simplificada — checklist, fotos, firma y cilindros
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        <UtpInspectionForm owners={owners} vehicles={vehicles} />
      </div>
    </div>
  );
}
