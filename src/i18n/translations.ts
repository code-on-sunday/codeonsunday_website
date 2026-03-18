export type Lang = 'en' | 'vi'

const translations = {
  en: {
    nav: {
      products: 'Products',
      blog: 'Blog',
      about: 'About',
    },
    hero: {
      greeting: 'Hi, I\'m',
      name: 'Hoàng Quốc Trung',
      nickname: 'CodeOnSunday',
      role: 'Senior Software Engineer',
      description: '7 years full-stack experience working directly with EU/US startups building products from scratch, including 3 years developing AI agents and applying AI to software development workflows.',
      cta: 'See my work',
    },
    products: {
      title: 'Products',
      subtitle: 'Things I\'m building',
      slideDeck: {
        name: 'Slide Deck Generator',
        description: 'Open source Claude Code skill for creating beautiful, presentation-ready slideshows from any content.',
        recentUpdate: 'Added 6 presentation decks covering LLMs, Context Engineering, and Claude Code Skills.',
        recentUpdateTime: 'Mar 2025',
      },
    },
    blog: {
      title: 'Blog',
      subtitle: 'Thoughts & experiments',
      viewAll: 'View all posts',
      empty: 'No posts yet. Stay tuned.',
      emptySubtitle: 'I\'ll be sharing product launch stories, revenue experiments, and lessons learned.',
      backHome: 'Back to home',
      page: 'Page',
    },
    about: {
      title: 'About',
      subtitle: 'The story so far',
      intro: 'I\'m Trung — a full-stack engineer who builds products.',
      p1: 'For the past 7 years, I\'ve been working as a Senior Software Engineer, collaborating directly with startups from Europe and the United States to build products from the ground up.',
      p2: 'Over the last 3 years, I\'ve focused heavily on AI — developing AI agents and integrating artificial intelligence into software development workflows. This journey led me to start building my own products as a solo founder.',
      p3: 'I created CodeOnSunday as a personal brand to share what I learn along the way — through code, content, and products that help other builders.',
      companyTitle: 'Company',
      companyName: 'CODEONSUNDAY CO., LTD',
      taxLabel: 'Tax number',
    },
    footer: {
      tagline: 'Building products, sharing the journey.',
      company: 'CODEONSUNDAY CO., LTD',
      taxNumber: 'Tax number: 0111098248',
      social: 'Connect',
    },
  },
  vi: {
    nav: {
      products: 'Sản phẩm',
      blog: 'Blog',
      about: 'Giới thiệu',
    },
    hero: {
      greeting: 'Xin chào, tôi là',
      name: 'Hoàng Quốc Trung',
      nickname: 'CodeOnSunday',
      role: 'Senior Software Engineer',
      description: '7 năm kinh nghiệm full stack developer trực tiếp làm việc với khách hàng là các startups Âu Mỹ xây dựng sản phẩm từ con số 0, trong đó có 3 năm kinh nghiệm phát triển sản phẩm AI agents và ứng dụng AI vào quy trình phát triển phần mềm.',
      cta: 'Xem sản phẩm',
    },
    products: {
      title: 'Sản phẩm',
      subtitle: 'Những thứ tôi đang xây dựng',
      slideDeck: {
        name: 'Slide Deck Generator',
        description: 'Skill mã nguồn mở cho Claude Code để tạo slideshow đẹp, sẵn sàng trình bày từ bất kỳ nội dung nào.',
        recentUpdate: 'Đã thêm 6 bộ slide trình bày về LLMs, Context Engineering, và Claude Code Skills.',
        recentUpdateTime: 'Tháng 3/2025',
      },
    },
    blog: {
      title: 'Blog',
      subtitle: 'Suy nghĩ & thí nghiệm',
      viewAll: 'Xem tất cả bài viết',
      empty: 'Chưa có bài viết nào.',
      emptySubtitle: 'Tôi sẽ chia sẻ câu chuyện ra mắt sản phẩm, thí nghiệm doanh thu, và bài học kinh nghiệm.',
      backHome: 'Về trang chủ',
      page: 'Trang',
    },
    about: {
      title: 'Giới thiệu',
      subtitle: 'Câu chuyện đến nay',
      intro: 'Tôi là Trung — một full-stack engineer xây dựng sản phẩm.',
      p1: 'Trong 7 năm qua, tôi đã làm việc với vai trò Senior Software Engineer, trực tiếp hợp tác với các startups từ Châu Âu và Hoa Kỳ để xây dựng sản phẩm từ con số 0.',
      p2: 'Trong 3 năm gần đây, tôi tập trung mạnh vào AI — phát triển AI agents và tích hợp trí tuệ nhân tạo vào quy trình phát triển phần mềm. Hành trình này đã dẫn tôi đến việc bắt đầu xây dựng sản phẩm riêng với tư cách solo founder.',
      p3: 'Tôi tạo CodeOnSunday như một thương hiệu cá nhân để chia sẻ những gì tôi học được — qua code, nội dung, và sản phẩm giúp ích cho những người xây dựng khác.',
      companyTitle: 'Công ty',
      companyName: 'CÔNG TY TNHH CODEONSUNDAY',
      taxLabel: 'Mã số thuế',
    },
    footer: {
      tagline: 'Xây dựng sản phẩm, chia sẻ hành trình.',
      company: 'CÔNG TY TNHH CODEONSUNDAY',
      taxNumber: 'Mã số thuế: 0111098248',
      social: 'Kết nối',
    },
  },
} as const

export default translations
