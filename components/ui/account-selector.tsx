"use client";

import { useState, useEffect } from "react";
import { Account, AccountType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormattedInput } from "@/components/ui/formatted-input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Calculator, DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AccountSelection {
  accountId: string;
  amount: number;
}

interface AccountSelectorProps {
  accounts: Account[];
  totalLoanAmount: number;
  selectedAccounts: AccountSelection[];
  onAccountsChange: (accounts: AccountSelection[]) => void;
}

interface PaymentAccountSelectorProps {
  accounts: Account[];
  selectedAccounts: AccountSelection[];
  onAccountSelect: (accounts: AccountSelection[]) => void;
  title?: string;
  description?: string;
  totalAmount: number;
}

const getAccountTypeLabel = (type: AccountType) => {
  switch (type) {
    case "BANCARIA":
      return "Bancaria";
    case "EFECTIVO":
      return "Efectivo";
    case "INVERSIONES":
      return "Inversiones";
    case "CREDITO":
      return "Crédito";
    case "OTROS":
      return "Otros";
    default:
      return type;
  }
};

// Componente para seleccionar cuentas de destino de pagos
export function PaymentAccountSelector({
  accounts,
  selectedAccounts,
  onAccountSelect,
  title = "Cuentas de Destino",
  description = "Seleccione las cuentas donde se depositará el pago",
  totalAmount,
}: PaymentAccountSelectorProps) {
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(totalAmount);

  // Filtrar cuentas disponibles (no seleccionadas)
  useEffect(() => {
    const selectedAccountIds = selectedAccounts.map((s) => s.accountId);
    const available = accounts.filter(
      (account) => !selectedAccountIds.includes(account.id)
    );
    setAvailableAccounts(available);
  }, [accounts, selectedAccounts]);

  // Actualizar el monto restante cuando cambie el total
  useEffect(() => {
    setRemainingAmount(totalAmount - totalAssigned);
  }, [totalAmount, totalAssigned]);

  // Calcular total asignado
  useEffect(() => {
    const totalAssigned = selectedAccounts.reduce(
      (sum, selection) => sum + selection.amount,
      0
    );
    setTotalAssigned(totalAssigned);
  }, [selectedAccounts]);

  // Obtener información de la cuenta
  const getAccountInfo = (accountId: string) => {
    return accounts.find((account) => account.id === accountId);
  };

  // Obtener saldo de la cuenta
  const getAccountBalance = (accountId: string) => {
    const account = getAccountInfo(accountId);
    return account?.balance || 0;
  };

  // Actualizar total asignado
  const updateTotalAssigned = (updatedAccounts: AccountSelection[]) => {
    const totalAssigned = updatedAccounts.reduce(
      (sum, selection) => sum + selection.amount,
      0
    );
    setTotalAssigned(totalAssigned);
  };

  // Distribución automática equitativa
  const distributeEqually = () => {
    if (selectedAccounts.length === 0) return;
    
    const baseAmountPerAccount = Math.floor(totalAmount / selectedAccounts.length);
    const remainder = totalAmount - (baseAmountPerAccount * selectedAccounts.length);
    
    const updated = selectedAccounts.map((selection, index) => {
      // Los primeros 'remainder' cuentas reciben un peso extra
      const amount = baseAmountPerAccount + (index < remainder ? 1 : 0);
      return {
        ...selection,
        amount: amount,
      };
    });
    onAccountSelect(updated);
  };

  // Completar automáticamente el monto restante
  const autoComplete = () => {
    if (selectedAccounts.length === 0 || remainingAmount <= 0) return;
    
    // Encontrar la cuenta con más saldo disponible
    const accountWithMostBalance = selectedAccounts.reduce((prev, current) => {
      const prevBalance = getAccountBalance(prev.accountId) - prev.amount;
      const currentBalance = getAccountBalance(current.accountId) - current.amount;
      return currentBalance > prevBalance ? current : prev;
    });
    
    const availableBalance = getAccountBalance(accountWithMostBalance.accountId) - accountWithMostBalance.amount;
    const amountToAdd = Math.min(remainingAmount, availableBalance);
    
    const updatedAccounts = selectedAccounts.map(selection => 
      selection.accountId === accountWithMostBalance.accountId
        ? { ...selection, amount: selection.amount + amountToAdd }
        : selection
    );
    
    onAccountSelect(updatedAccounts);
    updateTotalAssigned(updatedAccounts);
  };

  const addAccount = () => {
    if (availableAccounts.length === 0) return;

    const newSelection: AccountSelection = {
      accountId: availableAccounts[0].id,
      amount: 0,
    };

    const updatedSelections = [...selectedAccounts, newSelection];
    onAccountSelect(updatedSelections);
        
    // Redistribuir automáticamente de forma equitativa con manejo de restos
    const baseAmountPerAccount = Math.floor(totalAmount / updatedSelections.length);
    const remainder = totalAmount - (baseAmountPerAccount * updatedSelections.length);
    
    const redistributed = updatedSelections.map((selection, index) => {
      // Los primeros 'remainder' cuentas reciben un peso extra
      const amount = baseAmountPerAccount + (index < remainder ? 1 : 0);
      return {
        ...selection,
        amount: amount,
      };
    });
    
    onAccountSelect(redistributed);
  };

  const removeAccount = (accountId: string) => {
    const updated = selectedAccounts.filter((s) => s.accountId !== accountId);
    onAccountSelect(updated);

    // Redistribuir entre las cuentas restantes si hay alguna
    if (updated.length > 0) {
      // Redistribuir el monto de la cuenta eliminada con manejo de restos
      const baseAmountPerAccount = Math.floor(totalAmount / updated.length);
      const remainder = totalAmount - (baseAmountPerAccount * updated.length);
      
      const redistributed = updated.map((selection, index) => {
        // Los primeros 'remainder' cuentas reciben un peso extra
        const amount = baseAmountPerAccount + (index < remainder ? 1 : 0);
        return {
          ...selection,
          amount: amount,
        };
      });
      onAccountSelect(redistributed);
    }
  };

  const updateAmount = (accountId: string, amount: number) => {
    const validAmount = Math.max(0, amount);
    const accountBalance = getAccountBalance(accountId);
    
    // Calcular el total de otras cuentas
    const otherAccountsTotal = selectedAccounts
      .filter((s) => s.accountId !== accountId)
      .reduce((sum, s) => sum + s.amount, 0);

    // Validar que no exceda el saldo de la cuenta ni el monto total del pago
    const maxAllowedAmount = Math.min(
      validAmount,
      accountBalance,
      totalAmount - otherAccountsTotal
    );

    const updated = selectedAccounts.map((selection) =>
      selection.accountId === accountId
        ? { ...selection, amount: maxAllowedAmount }
        : selection
    );

    onAccountSelect(updated);
  };

  const updateAccount = (oldAccountId: string, newAccountId: string) => {
    const updated = selectedAccounts.map((selection) =>
      selection.accountId === oldAccountId
        ? { ...selection, accountId: newAccountId }
        : selection
    );

    onAccountSelect(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Total pago: </span>
              <span className="font-medium">
                {formatCurrency({ value: totalAmount, symbol: true })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Asignado: </span>
              <span className="font-medium">
                {formatCurrency({ value: totalAssigned, symbol: true })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Restante: </span>
              <span
                className={`font-medium ${
                  remainingAmount === 0
                    ? "text-green-600"
                    : remainingAmount > 0
                    ? "text-orange-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency({ value: remainingAmount, symbol: true })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Botones de distribución automática */}
        {selectedAccounts.length > 0 && (
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={distributeEqually}
              className="text-xs"
            >
              <Calculator className="h-3 w-3 mr-1" />
              Distribuir Igual
            </Button>
            {remainingAmount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={autoComplete}
                className="text-xs"
              >
                Completar
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedAccounts.map((selection, index) => {
          // Para este dropdown específico, mostrar:
          // 1. La cuenta actualmente seleccionada (si existe)
          // 2. Las cuentas que NO están seleccionadas en OTROS dropdowns
          const otherSelectedAccountIds = selectedAccounts
            .filter((_, i) => i !== index)
            .map((sa) => sa.accountId);
          
          const availableForThisSelection = accounts.filter(
            (account) => 
              account.id === selection.accountId || // Su cuenta actual
              !otherSelectedAccountIds.includes(account.id) // O cuentas no usadas por otros
          );

          return (
            <div
              key={index}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="flex-1">
                <Select
                  value={selection.accountId}
                  onValueChange={(value) => updateAccount(selection.accountId, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForThisSelection.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getAccountTypeLabel(account.type)}
                          </Badge>
                          <span className="text-muted-foreground text-sm">
                            Saldo: {formatCurrency({ value: account.balance, symbol: true })}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <FormattedInput
                  placeholder="Monto"
                  value={selection.amount}
                  onChange={(value) => updateAmount(selection.accountId, Number(value) || 0)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeAccount(selection.accountId)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {availableAccounts.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={addAccount}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Cuenta
          </Button>
        )}

        {selectedAccounts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay cuentas seleccionadas</p>
            <p className="text-sm">
              Haga clic en &quot;Agregar Cuenta&quot; para comenzar
            </p>
          </div>
        )}

        {remainingAmount !== 0 && selectedAccounts.length > 0 && Math.abs(remainingAmount) > 2 && (
          <div className={`p-3 rounded-lg border ${
            remainingAmount > 0 
              ? 'bg-yellow-100 border-yellow-300' 
              : 'bg-red-100 border-red-300'
          }`}>
            <p className={`text-sm ${
              remainingAmount > 0 ? 'text-yellow-800' : 'text-red-800'
            }`}>
              {remainingAmount > 0 ? (
                <>
                  <strong>¡Atención!</strong> Faltan{" "}
                  {formatCurrency({ value: remainingAmount, symbol: true })} por asignar.
                </>
              ) : (
                <>
                  <strong>¡Error!</strong> Se ha asignado{" "}
                  {formatCurrency({ value: Math.abs(remainingAmount), symbol: true })} de más.
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AccountSelector({
  accounts,
  totalLoanAmount,
  selectedAccounts,
  onAccountsChange,
}: AccountSelectorProps) {
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);

  // Filtrar cuentas disponibles (no seleccionadas)
  useEffect(() => {
    const selectedAccountIds = selectedAccounts.map((sa) => sa.accountId);
    const available = accounts.filter(
      (account) => !selectedAccountIds.includes(account.id)
    );
    setAvailableAccounts(available);
  }, [accounts, selectedAccounts]);

  // Calcular total asignado
  const totalAssigned = selectedAccounts.reduce(
    (sum, selection) => sum + selection.amount,
    0
  );

  const remaining = totalLoanAmount - totalAssigned;

  // Distribución automática equitativa
  const distributeEqually = () => {
    if (selectedAccounts.length === 0) return;
    
    const baseAmountPerAccount = Math.floor(totalLoanAmount / selectedAccounts.length);
    const remainder = totalLoanAmount - (baseAmountPerAccount * selectedAccounts.length);
    
    const updated = selectedAccounts.map((selection, index) => {
      // Los primeros 'remainder' cuentas reciben un peso extra
      const amount = baseAmountPerAccount + (index < remainder ? 1 : 0);
      return {
        ...selection,
        amount: amount,
      };
    });
    onAccountsChange(updated);
  };

  // Distribución proporcional (ahora equitativa ya que no consideramos saldos)
  const distributeByBalance = () => {
    if (selectedAccounts.length === 0) return;
    
    // Simplemente hacer distribución equitativa ya que no consideramos saldos
    distributeEqually();
  };

  // Completar automáticamente el monto restante
  const autoComplete = () => {
    if (remaining <= 0 || selectedAccounts.length === 0) return;
    
    // Buscar la cuenta con más saldo disponible para asignar el restante
    let bestAccountIndex = -1;
    let maxAvailableSpace = 0;

    selectedAccounts.forEach((selection, index) => {
      const account = getAccountInfo(selection.accountId);
      if (account) {
        const availableSpace = account.balance - selection.amount;
        if (availableSpace > maxAvailableSpace) {
          maxAvailableSpace = availableSpace;
          bestAccountIndex = index;
        }
      }
    });

    if (bestAccountIndex >= 0 && maxAvailableSpace >= remaining) {
      const updated = selectedAccounts.map((selection, index) =>
        index === bestAccountIndex
          ? { ...selection, amount: selection.amount + remaining }
          : selection
      );
      onAccountsChange(updated);
    }
  };

  // Agregar nueva cuenta con distribución automática
  const addAccount = () => {
    if (availableAccounts.length > 0) {
      const newSelection: AccountSelection = {
        accountId: availableAccounts[0].id,
        amount: 0,
      };
      const updatedSelections = [...selectedAccounts, newSelection];
      
      // Redistribuir automáticamente de forma equitativa con manejo de restos
      const baseAmountPerAccount = Math.floor(totalLoanAmount / updatedSelections.length);
      const remainder = totalLoanAmount - (baseAmountPerAccount * updatedSelections.length);
      
      const redistributed = updatedSelections.map((selection, index) => {
        // Los primeros 'remainder' cuentas reciben un peso extra
        const amount = baseAmountPerAccount + (index < remainder ? 1 : 0);
        return {
          ...selection,
          amount: amount,
        };
      });
      
      onAccountsChange(redistributed);
    }
  };

  // Remover cuenta y redistribuir
  const removeAccount = (index: number) => {
    const updated = selectedAccounts.filter((_, i) => i !== index);
    
    if (updated.length > 0) {
      // Redistribuir el monto de la cuenta eliminada con manejo de restos
      const baseAmountPerAccount = Math.floor(totalLoanAmount / updated.length);
      const remainder = totalLoanAmount - (baseAmountPerAccount * updated.length);
      
      const redistributed = updated.map((selection, index) => {
        // Los primeros 'remainder' cuentas reciben un peso extra
        const amount = baseAmountPerAccount + (index < remainder ? 1 : 0);
        return {
          ...selection,
          amount: amount,
        };
      });
      onAccountsChange(redistributed);
    } else {
      onAccountsChange(updated);
    }
  };

  // Actualizar monto de una cuenta
  const updateAmount = (index: number, amount: number) => {
    // Validar que la suma total no exceda el monto del préstamo
    const otherAccountsTotal = selectedAccounts
      .filter((_, i) => i !== index)
      .reduce((sum, selection) => sum + selection.amount, 0);
    
    const maxAllowedAmount = Math.min(
      Math.max(0, amount),
      totalLoanAmount - otherAccountsTotal
    );

    const updated = selectedAccounts.map((selection, i) =>
      i === index ? { ...selection, amount: maxAllowedAmount } : selection
    );
    onAccountsChange(updated);
  };

  // Actualizar cuenta seleccionada
  const updateAccount = (index: number, accountId: string) => {
    const updated = selectedAccounts.map((selection, i) =>
      i === index ? { ...selection, accountId } : selection
    );
    onAccountsChange(updated);
  };

  // Obtener información de la cuenta
  const getAccountInfo = (accountId: string) => {
    return accounts.find((account) => account.id === accountId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Cuentas de Origen</CardTitle>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Total préstamo: </span>
              <span className="font-medium">
                {formatCurrency({ value: totalLoanAmount, symbol: true })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Asignado: </span>
              <span className="font-medium">
                {formatCurrency({ value: totalAssigned, symbol: true })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Restante: </span>
              <span
                className={`font-medium ${
                  remaining === 0
                    ? "text-green-600"
                    : remaining > 0
                    ? "text-orange-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency({ value: remaining, symbol: true })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Botones de distribución automática */}
        {selectedAccounts.length > 0 && (
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={distributeEqually}
              className="text-xs"
            >
              <Calculator className="h-3 w-3 mr-1" />
              Distribuir Igual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={distributeByBalance}
              className="text-xs"
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Por Saldo
            </Button>
            {remaining > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={autoComplete}
                className="text-xs"
              >
                Completar
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedAccounts.map((selection, index) => {
          // Para este dropdown específico, mostrar:
          // 1. La cuenta actualmente seleccionada (si existe)
          // 2. Las cuentas que NO están seleccionadas en OTROS dropdowns
          const otherSelectedAccountIds = selectedAccounts
            .filter((_, i) => i !== index)
            .map((sa) => sa.accountId);
          
          const availableForThisSelection = accounts.filter(
            (account) => 
              account.id === selection.accountId || // Su cuenta actual
              !otherSelectedAccountIds.includes(account.id) // O cuentas no usadas por otros
          );

          return (
            <div
              key={index}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="flex-1">
                <Select
                  value={selection.accountId}
                  onValueChange={(value) => updateAccount(index, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForThisSelection.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getAccountTypeLabel(account.type)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <FormattedInput
                  placeholder="Monto"
                  value={selection.amount}
                  onChange={(value) => updateAmount(index, Number(value) || 0)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeAccount(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {availableAccounts.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={addAccount}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Cuenta
          </Button>
        )}

        {selectedAccounts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay cuentas seleccionadas</p>
            <p className="text-sm">
              Haga clic en &quot;Agregar Cuenta&quot; para comenzar
            </p>
          </div>
        )}

        {remaining !== 0 && selectedAccounts.length > 0 && Math.abs(remaining) > 2 && (
          <div className={`p-3 rounded-lg border ${
            remaining > 0 
              ? 'bg-yellow-100 border-yellow-300' 
              : 'bg-red-100 border-red-300'
          }`}>
            <p className={`text-sm ${
              remaining > 0 ? 'text-yellow-800' : 'text-red-800'
            }`}>
              {remaining > 0 ? (
                <>
                  <strong>¡Atención!</strong> Faltan{" "}
                  {formatCurrency({ value: remaining, symbol: true })} por asignar.
                </>
              ) : (
                <>
                  <strong>¡Error!</strong> Se ha asignado{" "}
                  {formatCurrency({ value: Math.abs(remaining), symbol: true })} de más.
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 