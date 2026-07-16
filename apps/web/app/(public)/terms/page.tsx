import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Điều khoản dịch vụ',
  description: 'Điều khoản và điều kiện sử dụng dịch vụ của DauTayToy Store.',
};

export default function TermsPage() {
  return (
    <section className="container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Điều khoản dịch vụ</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cập nhật lần cuối: 01/07/2026</p>

        <div className="prose-content mt-8">
          <p>
            Khi truy cập và sử dụng website DauTayToy Store, bạn đồng ý tuân thủ các điều khoản và
            điều kiện được nêu dưới đây.
          </p>

          <h2>1. Đặt hàng</h2>
          <p>
            Đơn hàng được xác nhận sau khi bạn hoàn tất bước thanh toán/đặt hàng trên website.
            Chúng tôi có quyền từ chối hoặc huỷ đơn hàng trong trường hợp sản phẩm hết hàng hoặc
            thông tin đặt hàng không chính xác.
          </p>

          <h2>2. Giá cả và thanh toán</h2>
          <p>
            Giá sản phẩm được niêm yết bằng đồng Việt Nam (VNĐ) và đã bao gồm các loại thuế áp
            dụng (nếu có). Hiện tại DauTayToy Store hỗ trợ hình thức thanh toán khi nhận hàng
            (COD).
          </p>

          <h2>3. Giao hàng</h2>
          <p>
            Thời gian giao hàng dự kiến được thông báo tại bước đặt hàng và có thể thay đổi tuỳ
            khu vực. DauTayToy Store không chịu trách nhiệm với các chậm trễ ngoài tầm kiểm soát
            (thiên tai, sự cố vận chuyển bất khả kháng).
          </p>

          <h2>4. Đổi trả và hoàn tiền</h2>
          <p>
            Sản phẩm có thể được đổi trả trong vòng 7 ngày kể từ ngày nhận hàng nếu còn nguyên tem
            mác, chưa qua sử dụng và có lỗi từ nhà sản xuất. Vui lòng liên hệ với chúng tôi trước
            khi gửi trả sản phẩm.
          </p>

          <h2>5. Quyền sở hữu trí tuệ</h2>
          <p>
            Toàn bộ nội dung, hình ảnh, logo trên website thuộc quyền sở hữu của DauTayToy Store
            hoặc được cấp phép sử dụng hợp pháp. Nghiêm cấm sao chép, sử dụng cho mục đích thương
            mại khi chưa được sự đồng ý.
          </p>

          <h2>6. Giới hạn trách nhiệm</h2>
          <p>
            DauTayToy Store nỗ lực đảm bảo thông tin sản phẩm chính xác nhưng không đảm bảo tuyệt
            đối không có sai sót. Chúng tôi sẽ khắc phục kịp thời khi phát hiện hoặc nhận được phản
            ánh từ khách hàng.
          </p>

          <h2>7. Thay đổi điều khoản</h2>
          <p>
            Điều khoản này có thể được cập nhật mà không cần thông báo trước. Việc tiếp tục sử
            dụng website sau khi thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới.
          </p>
        </div>
      </div>
    </section>
  );
}
