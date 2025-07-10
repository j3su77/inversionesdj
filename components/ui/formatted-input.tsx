"use client"

import React, { useEffect, useState } from "react"
import { Input } from "./input"

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number
  onChange: (value: string) => void
}

export function FormattedInput({ value, onChange, ...props }: FormattedInputProps) {
  const [displayValue, setDisplayValue] = useState("")

  // Función para formatear el número con separadores de miles (formato colombiano)
  const formatNumber = (num: string) => {
    // Remover cualquier caracter que no sea número o coma decimal
    const cleanNum = num.replace(/[^\d,]/g, "")
    
    // Si está vacío, retornar vacío
    if (!cleanNum) return ""
    
    // Si hay múltiples comas, mantener solo la primera
    const parts = cleanNum.split(',')
    if (parts.length > 2) {
      const integerPart = parts[0]
      const decimalPart = parts.slice(1).join('').substring(0, 2) // Máximo 2 decimales
      return integerPart + ',' + decimalPart
    }
    
    // Separar parte entera y decimal
    const [integerPart, decimalPart] = parts
    
    // Formatear solo la parte entera con separadores de miles (puntos)
    const formattedInteger = integerPart ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
    
    // Retornar con parte decimal si existe (máximo 2 decimales)
    if (decimalPart !== undefined) {
      const limitedDecimal = decimalPart.substring(0, 2)
      return `${formattedInteger},${limitedDecimal}`
    }
    
    return formattedInteger
  }

  // Función para desformatear el número (convertir a número válido)
  const unformatNumber = (str: string) => {
    if (!str) return ""
    // Remover separadores de miles (puntos) y convertir coma decimal a punto
    const unformatted = str.replace(/\./g, "").replace(",", ".")
    return unformatted
  }

  // Actualizar el valor mostrado cuando cambia el valor del prop
  useEffect(() => {
    if (value !== undefined && value !== null && value !== "") {
      const numValue = typeof value === 'number' ? value : parseFloat(value.toString())
      
      if (!isNaN(numValue)) {
        // Convertir el número a formato colombiano manualmente
        const [integerPart, decimalPart] = numValue.toString().split('.')
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
        const formattedForDisplay = decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger
        
        setDisplayValue(formattedForDisplay)
      } else {
        setDisplayValue("")
      }
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
    const unformattedValue = unformatNumber(formattedValue)
    onChange(unformattedValue)
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