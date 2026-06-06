// ============================================================
// Board Ready Beauty — Purchase Flow
// ============================================================


// 1. Redirect to password-set page immediately after payment
// ============================================================
add_action( 'woocommerce_thankyou', 'brb_redirect_after_payment', 10, 1 );
function brb_redirect_after_payment( $order_id ) {
    if ( ! $order_id ) return;

    $order = wc_get_order( $order_id );
    if ( ! $order ) return;

    if ( in_array( $order->get_status(), array( 'processing', 'completed' ), true ) ) {
        wp_safe_redirect( home_url( '/my-account/lost-password/' ) );
        exit;
    }
}


// 2. Add customer to Brevo list on order completion
// ============================================================
add_action( 'woocommerce_order_status_completed', 'brb_add_customer_to_brevo', 10, 1 );
function brb_add_customer_to_brevo( $order_id ) {
    if ( ! $order_id ) return;

    $order = wc_get_order( $order_id );
    if ( ! $order ) return;

    $api_key    = get_option('brb_brevo_api_key');
    $email      = $order->get_billing_email();
    $first_name = $order->get_billing_first_name();

    wp_remote_post(
        'https://api.brevo.com/v3/contacts',
        array(
            'headers' => array(
                'api-key'      => $api_key,
                'Content-Type' => 'application/json',
            ),
            'body'    => wp_json_encode( array(
                'email'         => $email,
                'attributes'    => array( 'FIRSTNAME' => $first_name ),
                'listIds'       => array( 6 ),
                'updateEnabled' => true,
            ) ),
            'timeout' => 15,
        )
    );
}


// 3. Send branded PassBoard access email on order completion
// ============================================================
add_action( 'woocommerce_order_status_completed', 'brb_send_passboard_access_email', 20, 1 );
function brb_send_passboard_access_email( $order_id ) {
    if ( ! $order_id ) return;

    $order = wc_get_order( $order_id );
    if ( ! $order ) return;

    $to         = $order->get_billing_email();
    $first_name = esc_html( $order->get_billing_first_name() );
    $subject    = 'Your PassBoard access is ready 🎓';

    $body = <<<HTML
<!DOCTYPE html>
<html>
<body style="font-family: 'DM Sans', Arial, sans-serif; background: #fdf9f6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

    <!-- Header -->
    <div style="background: #c8185a; padding: 40px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-family: Georgia, serif;">
        You're in. 🎓
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 40px;">
      <p style="font-size: 16px; color: #1e1a20; line-height: 1.7;">
        Hi {$first_name},
      </p>
      <p style="font-size: 16px; color: #1e1a20; line-height: 1.7;">
        Your PassBoard account has been created. Two quick steps to get started:
      </p>

      <!-- Step 1 -->
      <div style="background: #fbeef4; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #c8185a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">
          Step 1
        </p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1e1a20;">
          Set your PassBoard password
        </p>
        <a href="https://boardreadybeauty.com/my-account/lost-password/"
          style="display: inline-block; background: #c8185a; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Create My Password →
        </a>
      </div>

      <!-- Step 2 -->
      <div style="background: #fdf9f6; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #ecdde5;">
        <p style="margin: 0 0 8px; font-weight: 700; color: #1e1a20; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">
          Step 2 — After setting your password
        </p>
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1e1a20;">
          Log into PassBoard and start studying
        </p>
        <a href="https://board-ready-exam.vercel.app"
          style="display: inline-block; background: #1e1a20; color: #ffffff; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Access PassBoard →
        </a>
      </div>

      <p style="font-size: 15px; color: #6b6170; line-height: 1.7;">
        You've put in 1,500 hours learning your craft. PassBoard is going to make sure every one of them counts on exam day.
      </p>
      <p style="font-size: 15px; color: #6b6170;">
        Questions? Reply to this email anytime.
      </p>
      <p style="font-size: 15px; color: #1e1a20; font-weight: 600;">
        — Board Ready Beauty
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #fdf9f6; padding: 24px 40px; text-align: center; border-top: 1px solid #ecdde5;">
      <p style="font-size: 12px; color: #6b6170; margin: 0;">
        Board Ready Beauty · Princeton, TX ·
        <a href="https://boardreadybeauty.com" style="color: #c8185a;">boardreadybeauty.com</a>
      </p>
    </div>

  </div>
</body>
</html>
HTML;

    $headers = array(
        'Content-Type: text/html; charset=UTF-8',
        'From: Board Ready Beauty <admin@boardreadybeauty.com>',
    );

    wp_mail( $to, $subject, $body, $headers );
}


// 4. Redirect to PassBoard after password reset
// wp_redirect() is required here because wp_safe_redirect() blocks external domains by default.
// ============================================================
add_action( 'woocommerce_customer_reset_password', 'brb_redirect_after_password_reset', 10, 1 );
function brb_redirect_after_password_reset( $user ) {
    wp_redirect( 'https://board-ready-exam.vercel.app' );
    exit;
}
