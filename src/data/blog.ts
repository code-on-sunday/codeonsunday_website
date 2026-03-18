export interface BlogPost {
  slug: string
  title: { en: string; vi: string }
  excerpt: { en: string; vi: string }
  content: { en: string; vi: string }
  date: string
  tags: string[]
  youtubeId?: string
  youtubeShort?: boolean
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'dev-pm-shift-claude-code',
    title: {
      en: 'What Changed in My Software Projects After Going 100% Claude Code',
      vi: 'Thay đổi trong các dự án phần mềm khi sử dụng Claude Code 100%',
    },
    excerpt: {
      en: 'Task scope grew significantly, planning went deeper, and both PM and dev roles are under pressure to evolve.',
      vi: 'Scope của task tăng lên rõ rệt, việc lên kế hoạch kĩ hơn, và cả PM lẫn dev đều chịu áp lực thay đổi.',
    },
    content: {
      en: `What changed in my software projects after going 100% Claude Code:

**Task scope grew significantly** — Claude codes through multiple parts in one go. Instead of verifying each small piece, I just tell it to set up e2e tests and I verify the final result manually. Massive context-switching savings.

**The time I saved from not coding goes into deep planning** — sometimes multiple sessions with Claude exploring approaches and evaluating trade-offs. Better planning also means Claude's implementation is more accurate.

**Both PM and dev roles are under pressure to evolve.** Two reasons:
- Claude is strong at UX and documentation research, so devs can now propose or decide optimal user flows that fit business logic without consulting PM.
- But Claude is also extremely thorough, sometimes overthinking, surfacing edge cases humans wouldn't have considered. Devs can't resolve those alone, so the hard decisions land on PM's desk.

**The result:** PMs don't need to go deep into specs, they can delegate more to devs, but they need solid knowledge and skills to prove their value on the cases that truly matter. And they need to understand that product quality standards must rise or competitors will leave them behind. Devs also need to adapt, picking up new skills and mindsets to use AI effectively.`,
      vi: `Đây là tình hình trong các dự án phần mềm mình tham gia, khi sử dụng Claude Code 100%:

**Scope của task tăng lên rõ rệt** vì Claude có thể code 1 mạch nhiều phần hơn. Thay vì mất công kiểm tra từng phần nhỏ thì mình chỉ cần nói nó cài e2e test và mình kiểm tra bằng tay kết quả cuối cùng. Tiết kiệm thời gian chuyển đổi ngữ cảnh (context switching) rất nhiều.

**Thời gian dư ra do không phải code, mình dành cho việc thảo luận rất kĩ** — có khi mất mấy sessions với Claude để lên kế hoạch, khảo sát từng hướng đi, đánh giá trade-offs. Việc thảo luận kĩ cũng giúp quá trình triển khai của Claude chính xác hơn.

**Áp lực thay đổi tư duy làm việc đang diễn ra cho cả PM và dev.** Có 2 lí do:
- Claude rất mạnh về trải nghiệm người dùng và nghiên cứu tài liệu, nên bây giờ dev có thể tự đề xuất hoặc tự quyết được những luồng UX tối ưu và khớp với business logic mà không cần tham khảo PM.
- Claude rất chi tiết, đôi khi overthinking, vì vậy nó sẽ đưa ra nhiều trường hợp mà chính con người cũng không nghĩ tới trước đó. Tất nhiên dev không tự giải quyết được case này và việc khó này sẽ tới tay PM.

**Kết quả:** PM có thể không cần quá đi sâu vào spec, có thể trao quyền cho dev nhiều hơn, nhưng cần phải vững kiến thức và kĩ năng để chứng minh giá trị trong những case thật cần thiết, ngoài ra cũng phải hiểu rằng chuẩn chất lượng sản phẩm cũng cần phải tăng lên nếu không muốn bị đối thủ bỏ xa. Còn dev cũng phải linh hoạt hơn để tiếp nhận kĩ năng và tư duy mới để sử dụng AI hiệu quả.`,
    },
    date: '2026-03-17',
    tags: ['claude-code', 'AI', 'software-dev'],
    youtubeId: 'aPYVDi236hk',
  },
  {
    slug: 'google-ai-studio-kids-game',
    title: {
      en: 'Making a Keyboard Learning Game for My 3.5yo Daughter with Google AI Studio',
      vi: 'Làm game học bàn phím cho con gái 3 tuổi rưỡi bằng Google AI Studio',
    },
    excerpt: {
      en: 'First time making a game with Google AI Studio — my daughter started memorizing keyboard letters incredibly fast.',
      vi: 'Lần đầu tiên làm game cho con bằng Google AI Studio, con gái đã bắt đầu nhớ được các chữ trên bàn phím rất nhanh chóng.',
    },
    content: {
      en: `First time making a game for my kid using Google AI Studio — my 3.5-year-old daughter started memorizing keyboard letters incredibly fast!

I still use Claude Code for work 100%, but I have to admit Google AI Studio does a great job with the "UI + Experience" of the game (this is my feeling after several attempts at making games before).

As shown in the video, the interface is very child-friendly with great effects! Besides Monkey Junior and Khan Academy Kids, my daughter Táo had never played a game before, so she was immediately hooked.

**She can play in one go up to a high score of over 300 points!**

I also recently added a feature to adjust the interval between falling letters, after my daughter occasionally complained "too fast" (because multiple letters were falling on screen at once).

A very interesting behavior I would never have thought of without my daughter actually playing: when multiple letters fall at the same time, she tries to press all of them simultaneously on the keyboard (instead of pressing one at a time).

That's why she can't play when 3 or more letters fall at once!

**Just one description and you get a simple game that meets exactly the need!**`,
      vi: `Lần đầu tiên làm game cho con bằng Google AI Studio, con gái 3 tuổi rưỡi đã bắt đầu nhớ được các chữ trên bàn phím rất nhanh chóng!

Mình vẫn dùng Claude Code cho công việc 100%, nhưng phải công nhận Google AI Studio làm rất tốt về mặt "Giao diện + Trải nghiệm" của game (đây là cảm nhận sau một số lần thử làm game trước đây).

Như trong video, giao diện rất phù hợp với trẻ em, hiệu ứng rất tốt! Ngoài Monkey Junior và Khan Academy Kids, Táo chưa chơi game bao giờ nên lập tức bị thu hút ngay.

**Con có thể chơi 1 mạch tới lần cao nhất là hơn 300 điểm!**

Mình cũng mới thêm chức năng chỉnh khoảng cách giữa các lần chữ rơi, sau khi con gái thi thoảng kêu "nhanh quá" (do có nhiều chữ đang rơi trên màn hình 1 lúc).

Một hành vi rất thú vị mà mình không bao giờ nghĩ tới nếu không có con gái thực sự chơi, đó là khi có nhiều chữ rơi cùng lúc, con sẽ cố gắng bấm cùng lúc các chữ đó trên bàn phím (thay vì bấm lần lượt).

Đó là lí do con không thể chơi được nếu có từ 3 chữ cùng rơi 1 lúc!

**Chỉ với 1 lần mô tả đã có 1 game đơn giản đáp ứng đúng nhu cầu!**`,
    },
    date: '2026-03-15',
    tags: ['google-ai-studio', 'AI', 'parenting'],
    youtubeId: 'feXWb62XT0E',
    youtubeShort: true,
  },
]

export const POSTS_PER_PAGE = 6
