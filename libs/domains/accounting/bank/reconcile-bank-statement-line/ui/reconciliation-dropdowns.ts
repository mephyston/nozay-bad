export function scrollMemberOptionIntoView(index: number) {
  setTimeout(() => {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('member-listbox');
    const option = document.getElementById(`member-option-${index}`);
    if (container && option) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const optionTop = option.offsetTop;
      const optionBottom = optionTop + option.clientHeight;
      if (optionTop < containerTop) {
        container.scrollTop = optionTop;
      } else if (optionBottom > containerBottom) {
        container.scrollTop = optionBottom - container.clientHeight;
      }
    }
  }, 0);
}

export function scrollCategoryOptionIntoView(index: number) {
  setTimeout(() => {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('category-listbox');
    const option = document.getElementById(`category-option-${index}`);
    if (container && option) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const optionTop = option.offsetTop;
      const optionBottom = optionTop + option.clientHeight;
      if (optionTop < containerTop) {
        container.scrollTop = optionTop;
      } else if (optionBottom > containerBottom) {
        container.scrollTop = optionBottom - container.clientHeight;
      }
    }
  }, 0);
}
