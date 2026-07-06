"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBusiness } from "@/actions/superadmin";
import { Button } from "@/components/ui/button";

interface DeleteBusinessButtonProps {
    businessId: string;
}

export const DeleteBusinessButton = ({ businessId }: DeleteBusinessButtonProps) => {
    const [isPending, startTransition] = useTransition();

    const onClick = () => {
        startTransition(() => {
            deleteBusiness(businessId)
                .then((data) => {
                    if ('error' in data && data.error) {
                        toast.error(data.error as string);
                    }
                    if ('success' in data && data.success) {
                        toast.success("Negocio eliminado correctamente");
                    }
                })
        });
    };

    return (
        <Button 
            variant="destructive" 
            size="sm" 
            onClick={onClick}
            disabled={isPending}
        >
            {isPending ? "Eliminando..." : "Eliminar"}
        </Button>
    );
};
