<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

/** In-game style Yes/No prompt (native modal `<dialog>`). Esc or No cancels, cursor starts on Yes. */
const props = withDefaults(defineProps<{ open: boolean; message: string; detail?: string; confirmLabel?: string }>(), {
  detail: '',
  confirmLabel: 'Yes',
})
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const yes = ref<HTMLButtonElement | null>(null)
const no = ref<HTMLButtonElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    const d = dialog.value
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      await nextTick()
      yes.value?.focus()
    } else if (!open && d.open) d.close()
  },
)

// keys stay inside the dialog: global shortcuts listen on window
function onKey(e: KeyboardEvent) {
  e.stopPropagation()
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault()
    ;(document.activeElement === yes.value ? no : yes).value?.focus()
  }
}
</script>

<template>
  <dialog ref="dialog" class="confirm panel" data-testid="confirm-dialog" @cancel.prevent="emit('cancel')" @keydown="onKey">
    <p class="msg">{{ message }}</p>
    <p v-if="detail" class="dim detail">{{ detail }}</p>
    <div class="buttons">
      <button ref="yes" class="btn" data-testid="confirm-yes" @click="emit('confirm')">{{ confirmLabel }}</button>
      <button ref="no" class="btn" data-testid="confirm-no" @click="emit('cancel')">No</button>
    </div>
  </dialog>
</template>

<style scoped>
.confirm {
  min-width: 280px;
  padding: 16px 20px;
  color: var(--text);
  border: 1px solid var(--border-strong);
}
.confirm:not([open]) {
  display: none;
}
.confirm::backdrop {
  background: rgba(0, 0, 0, 0.55);
}
.msg {
  margin: 0 0 4px;
  font-size: 15px;
  color: var(--gold);
}
.detail {
  margin: 0;
  font-size: 12px;
}
.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}
.buttons .btn {
  min-width: 64px;
}
.buttons .btn:focus-visible,
.buttons .btn:focus {
  border-color: var(--gold);
  color: var(--gold);
}
</style>
