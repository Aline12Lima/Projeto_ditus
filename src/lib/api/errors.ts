import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Dados inválidos.", details: error.flatten() }, { status: 400 });
  console.error(error);
  const knownMessages: Record<string, string> = {
    TABLE_NOT_FOUND: "Mesa não encontrada.", TABLE_AWAITING_PAYMENT: "A mesa está aguardando pagamento.",
    EMPTY_ORDER: "O pedido precisa ter ao menos um item.", INVALID_ITEM: "O pedido possui um item inválido.",
    PRODUCT_NOT_FOUND_OR_INACTIVE: "Um produto não existe ou está indisponível.",
    ORDER_NOT_FOUND: "Pedido não encontrado.", INVALID_STATUS_TRANSITION: "Transição de status inválida.",
    CUSTOMER_AWAITING_TABLE: "Aguardando associação de uma mesa.", VISIT_NOT_FOUND:"Atendimento não encontrado.",
    VISIT_NOT_WAITING:"O atendimento já foi associado.", TABLE_NOT_FREE:"A mesa selecionada não está livre.",
    INVALID_TABLE_ACCESS:"QR Code da mesa inválido.",TABLE_OCCUPIED:"Esta mesa já possui um atendimento ativo.",
    VISIT_ASSIGNED_TO_ANOTHER_TABLE:"Este atendimento pertence a outra mesa.",ORDER_NOT_EDITABLE:"O pedido não pode mais ser editado.",
    PAYMENT_NOT_ALLOWED:"O pagamento ainda não pode ser solicitado.",PAYMENT_ALREADY_REQUESTED:"Já existe outra solicitação de pagamento.",
    PAYMENT_NOT_FOUND:"Solicitação de pagamento não encontrada.",PAYMENT_REPORT_NOT_ALLOWED:"Não é possível informar este pagamento.",
    PAYMENT_CONFIRM_NOT_ALLOWED:"Não é possível confirmar este pagamento.",ADMIN_REQUIRED:"Apenas administradores podem confirmar pagamentos.",
    INVALID_REVIEW:"Avaliação inválida.",REVIEW_NOT_ALLOWED:"A avaliação só pode ser enviada após o pagamento.",REVIEW_ALREADY_EXISTS:"Este pedido já foi avaliado.",
  };
  const rawMessage = error instanceof Error ? error.message : "";
  const safeMessage = Object.entries(knownMessages).find(([code]) => rawMessage.includes(code))?.[1] ?? "Não foi possível concluir a operação.";
  return NextResponse.json({ error: safeMessage }, { status: 500 });
}
