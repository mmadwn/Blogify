document.addEventListener('DOMContentLoaded', () => {
    const deleteButtons = document.querySelectorAll('.btn.delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Apakah Anda yakin?',
                text: "Artikel yang dihapus tidak dapat dikembalikan!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, hapus!',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Jika pengguna mengkonfirmasi, lanjutkan dengan penghapusan
                    button.closest('form').submit();
                }
            });
        });
    });

    // Tambahkan fungsi untuk mengambil artikel terakhir dari localStorage
    const getLastCreatedArticle = () => {
        const lastArticle = localStorage.getItem('lastCreatedArticle');
        return lastArticle ? JSON.parse(lastArticle) : null;
    };

    // Tampilkan artikel terakhir yang dibuat (jika ada)
    const lastArticleContainer = document.getElementById('last-created-article');
    if (lastArticleContainer) {
        const lastArticle = getLastCreatedArticle();
        if (lastArticle) {
            lastArticleContainer.innerHTML = `
                <h3>Artikel Terakhir yang Dibuat:</h3>
                <p><strong>${lastArticle.title}</strong> oleh ${lastArticle.author}</p>
                <p>Kategori: ${lastArticle.category}</p>
                <small>Dibuat pada: ${new Date(lastArticle.createdAt).toLocaleString()}</small>
            `;
        }

    }
});