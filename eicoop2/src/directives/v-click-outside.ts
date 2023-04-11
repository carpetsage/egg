import { DirectiveBinding, ObjectDirective } from 'vue';

interface ClickOutsideElement extends HTMLElement {
  _clickOutsideListener: (event: MouseEvent) => void;
}

interface Binding {
  handler: (event: MouseEvent) => void;
  // If trigger is specified, ignore clicks on the trigger, since the trigger
  // should implement toggling separately.
  trigger?: HTMLElement | null;
}

export const directive: ObjectDirective = {
  mounted(el: ClickOutsideElement, binding: DirectiveBinding<Binding>) {
    const { handler, trigger } = binding.value;
    el._clickOutsideListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!el.contains(target) && !(trigger && trigger.contains(target))) {
        handler(event);
      }
    };
    document.addEventListener('click', el._clickOutsideListener);
  },
  unmounted(el: ClickOutsideElement) {
    document.removeEventListener('click', el._clickOutsideListener);
  },
};
