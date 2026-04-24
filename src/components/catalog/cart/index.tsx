"use client";

import { useContext, useState } from "react";
import Image from "next/image";
import { CartContext } from "../context/CartContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Plus, Minus, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CheckoutForm } from "./checkout-form";
import { cn } from "@/lib/utils";

interface PublicCartProps {
  businessId: string;
}

export function PublicCart({ businessId }: PublicCartProps) {
  const { cartState, removeAll, removeItem, addUnit, removeUnit } = useContext(CartContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);

  const itemCount = cartState.products.reduce((acc, item) => acc + (item.amount || 0), 0);
  const cartTotal = cartState.products.reduce(
    (acc, item) => acc + (item.salePrice || item.price || 0) * (item.amount || 1),
    0
  );

  const handleSheetChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => setIsCheckout(false), 300);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetChange}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 transition-transform hover:scale-105"
        >
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 px-2 py-1 rounded-full flex items-center justify-center min-w-6"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-4 sm:p-6 overflow-hidden lg:[&>button]:hidden">
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle className="text-2xl font-bold">
            {isCheckout ? "Detalle del Pedido" : "Carrito de compras"}
          </SheetTitle>
          {/* Caption: items and units */}
          {cartState.products.length > 0 && !isCheckout && (
            <p className="text-sm text-muted-foreground mt-1">
              {cartState.products.length} {cartState.products.length === 1 ? 'producto' : 'productos'} • {' '}
              {itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}
            </p>
          )}
        </SheetHeader>

        {isCheckout ? (
          <div className="flex-1 overflow-y-auto pr-2">
            <CheckoutForm
              businessId={businessId}
              onSuccess={() => setIsOpen(false)}
              onCancel={() => setIsCheckout(false)}
            />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {cartState.products.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-4">
                  <ShoppingCart className="h-16 w-16 opacity-20" />
                  <p className="text-lg">Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {cartState.products.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex items-start gap-0 p-0 bg-slate-50 dark:bg-gray-900 rounded-xl border overflow-hidden"
                    >
                      {/* Image - Left side, edge to edge */}
                      <div className="w-20 h-20 shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.description || "Producto"}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                            <ShoppingCart className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Info - Right side of image */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between p-2.5">
                        {/* Top row: Name and size */}
                        <div className="flex items-start justify-between gap-2">
                          <p 
                            className="font-semibold text-sm leading-tight line-clamp-2" 
                            title={item.description || ""}
                          >
                            {item.description}
                          </p>
                          {(item as any).size && (
                            <span className="text-[10px] font-medium bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">
                              {(item as any).size}
                            </span>
                          )}
                        </div>

                        {/* Bottom row: Price and quantity */}
                        <div className="flex items-end justify-between gap-2">
                          <p className="text-primary font-bold text-base">
                            ${(item.salePrice || item.price || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </p>
                          
                          {/* Quantity controls */}
                          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded"
                              onClick={() => removeUnit(item)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-bold w-5 text-center">
                              {item.amount}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded"
                              onClick={() => addUnit(item)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Remove button - far right */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-full w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-l-none border-l"
                        onClick={() => removeItem(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartState.products.length > 0 && (
              <div className="pt-4 border-t shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-muted-foreground">Total Estimado</span>
                  <span className="text-2xl font-black">
                    ${cartTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {/* Equal width buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 font-semibold text-destructive hover:bg-destructive/10"
                    onClick={() => removeAll()}
                  >
                    Vaciar
                  </Button>
                  <Button
                    className="flex-1 font-semibold"
                    size="lg"
                    onClick={() => setIsCheckout(true)}
                  >
                    Ir a Pagar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}