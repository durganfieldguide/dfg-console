'use client';

import * as React from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  return (
    <Transition show={open}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className={cn(
                  'relative w-full max-w-lg transform overflow-hidden rounded-lg border p-6 shadow-xl transition-all',
                  className
                )}
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
              >
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>

                {title && (
                  <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {description}
                  </p>
                )}

                <div className={cn(title || description ? 'mt-4' : '')}>
                  {children}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  const confirmButtonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="rounded-md px-4 py-2 text-sm font-medium border hover:bg-muted"
          style={{ borderColor: 'var(--border)' }}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
            confirmButtonStyles[variant]
          )}
        >
          {loading ? 'Loading...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
