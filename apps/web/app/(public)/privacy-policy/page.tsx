import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
  description: 'Chính sách bảo mật thông tin khách hàng tại DauTayToy Store.',
};

export default function PrivacyPolicyPage() {
  return (
    <section className="container py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Chính sách bảo mật</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cập nhật lần cuối: 01/07/2026</p>

        <div className="prose-content mt-8">
          <p>
            DauTayToy Store cam kết bảo vệ thông tin cá nhân của khách hàng. Chính sách này giải
            thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin bạn cung cấp khi sử dụng
            website.
          </p>

          <h2>1. Thông tin chúng tôi thu thập</h2>
          <ul>
            <li>Thông tin tài khoản: họ tên, email, số điện thoại.</li>
            <li>Thông tin đơn hàng: địa chỉ giao hàng, lịch sử mua hàng.</li>
            <li>Thông tin kỹ thuật: loại thiết bị, trình duyệt, dùng để cải thiện trải nghiệm.</li>
          </ul>

          <h2>2. Mục đích sử dụng thông tin</h2>
          <p>Thông tin của bạn được sử dụng để:</p>
          <ul>
            <li>Xử lý và giao đơn hàng.</li>
            <li>Liên hệ hỗ trợ khi cần thiết.</li>
            <li>Gửi thông báo về đơn hàng, khuyến mãi (nếu bạn đăng ký nhận).</li>
            <li>Cải thiện chất lượng sản phẩm và dịch vụ.</li>
          </ul>

          <h2>3. Chia sẻ thông tin</h2>
          <p>
            Chúng tôi không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Thông tin
            chỉ được chia sẻ với đơn vị vận chuyển để thực hiện giao hàng, hoặc khi có yêu cầu từ
            cơ quan pháp luật có thẩm quyền.
          </p>

          <h2>4. Bảo mật thông tin</h2>
          <p>
            Mật khẩu tài khoản được mã hoá trước khi lưu trữ. Chúng tôi áp dụng các biện pháp kỹ
            thuật và tổ chức phù hợp để bảo vệ dữ liệu khỏi truy cập, thay đổi hoặc tiết lộ trái
            phép.
          </p>

          <h2>5. Quyền của khách hàng</h2>
          <p>
            Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xoá thông tin cá nhân của mình bất kỳ lúc nào
            bằng cách liên hệ với chúng tôi qua trang{' '}
            <a href="/contact">Liên hệ</a>.
          </p>

          <h2>6. Thay đổi chính sách</h2>
          <p>
            Chính sách này có thể được cập nhật theo thời gian. Mọi thay đổi sẽ được đăng tải trên
            trang này kèm ngày cập nhật mới nhất.
          </p>
        </div>
      </div>
    </section>
  );
}
