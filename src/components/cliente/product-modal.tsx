import type { Dish } from "@/types/menu";
import { ProductImage } from "@/components/shared/product-image";

type ProductModalProps = {
  dish: Dish;
  onAdd: () => void;
  onClose: () => void;
};

export function ProductModal({ dish, onAdd, onClose }: ProductModalProps) {
  return (
    <div className="modal-backdrop product-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" aria-label="Fechar detalhes" onClick={onClose}>×</button>
        <ProductImage className="product-photo" src={dish.imageUrl} alt={dish.name} fallback={dish.emoji} />
        <p className="product-category">{dish.category}</p>
        <h2 id="product-modal-title">{dish.name}</h2>
        <p>{dish.description}</p>
        <strong>{dish.price}</strong>
        <button className="solid-button" onClick={onAdd}>Adicionar ao carrinho</button>
        <button className="text-button" onClick={onClose}>Fechar</button>
      </section>
    </div>
  );
}
