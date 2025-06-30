"use client"

import React, { useEffect, useState } from "react"
import { Input } from "./input"

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number
  onChange: (value: string) => void
}

export function FormattedInput({ value, onChange, ...props }: FormattedInputProps) {
  const [displayValue, setDisplayValue] = useState("")

  // Función para formatear el número con separadores de miles
  const formatNumber = (num: string) => {
    // Remover cualquier caracter que no sea número
    const cleanNum = num.replace(/[^\d]/g, "")
    // Convertir a número y formatear con separadores de miles
    return cleanNum.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  // Función para desformatear el número (quitar separadores)
  const unformatNumber = (str: string) => {
    return str.replace(/\./g, "")
  }

  // Actualizar el valor mostrado cuando cambia el valor del prop
  useEffect(() => {
    if (value) {
      setDisplayValue(formatNumber(value.toString()))
    } else {
      setDisplayValue("")
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Formatear el valor para mostrar
    const formattedValue = formatNumber(newValue)
    setDisplayValue(formattedValue)
    // Enviar el valor sin formato al padre
    onChange(unformatNumber(formattedValue))
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
    />
  )
} 