// Products and links are rendered on the server; JavaScript only adds conveniences.
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-wish-id]').forEach(button=>{
    button.setAttribute('aria-pressed',String(LZ.isWished(button.dataset.wishId)));
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-wish-id]');
    if(button) requestAnimationFrame(()=>button.setAttribute('aria-pressed',String(LZ.isWished(button.dataset.wishId))));
  });
  document.addEventListener('error',event=>{
    if(event.target.hasAttribute?.('srcset')){event.target.removeAttribute('srcset');event.target.src=event.target.getAttribute('src');return;}
    if(event.target.matches?.('.img-secondary')){event.target.closest('.product-media')?.classList.add('no-alt');event.target.remove();}
  },true);
});
