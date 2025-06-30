"use client";

import {
  AlertDialog,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  children: ReactNode;
  title: ReactNode;
  textBtn?: ReactNode;
  btnClass?: string;
  btnCloseClass?: string;
  modalClass?: string;
  btnDisabled?: boolean;
  large?: boolean;
  onAccept?: () => void | Promise<void> | undefined;
  onClose?: () => void | undefined;
  btnAsChild?: boolean;
  close?: boolean;
  openDefault?: boolean;
}

export const SimpleModal = ({
  children,
  title,
  textBtn,
  btnClass,
  btnCloseClass,
  btnDisabled,
  onAccept,
  onClose,
  large = true,
  btnAsChild,
  close,
  modalClass,
  openDefault,
}: ConfirmModalProps) => {
  const [open, setOpen] = useState(openDefault);

  const handleClose = () => {
    setOpen(false);
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (close) {
      setOpen(false);
      if (onClose) {
        onClose();
      }
    }
  }, [close, onClose]);

  const onClickAcept = () => {
    setOpen(false);
    if (onAccept) {
      onAccept();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          asChild={btnAsChild}
          disabled={btnDisabled}
          className={cn("rounded-sm", btnClass)}
          variant="default"
        >
          {textBtn}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent
        className={cn(
          `overflow-y-auto pt-0 px-0 rounded-md ${
            large ? "max-w-screen-lg min-h-[300px]" : "max-w-[600px] w-[95%]"
          }  max-h-screen ${modalClass}`
        )}
      >
        <AlertDialogHeader className="">
          <AlertDialogTitle className="text-xl p-2 bg-primary text-primary-foreground">
            <div className="flex justify-between items-center">
              {title}
              <Button
                className={cn(
                  "w-fit h-fit flex rounded-sm justify-center items-center p-0",
                  btnCloseClass
                )}
                variant="secondary"
                onClick={handleClose}
              >
                <X className="text-white w-5 h-5" />
              </Button>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>
        <div className="w-full px-3 pt-3">{children}</div>

        <AlertDialogFooter className="gap-3 flex items-center h-full px-3">
          {onAccept && (
            <Button
              className={cn("bg-zinc-600 hover:bg-zinc-700")}
              onClick={handleClose}
            >
              Cancelar
            </Button>
          )}
          {onAccept && <Button onClick={onClickAcept}>Aceptar</Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
