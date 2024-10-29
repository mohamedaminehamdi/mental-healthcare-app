import Image from "next/image";
import { redirect } from "next/navigation";

import { AppointmentForm } from "@/components/forms/AppointmentForm";
import Navbar from "@/components/Navbar";
import { getPatient } from "@/lib/actions/patient.actions";

const Appointment = async ({ params }: SearchParamProps) => {
  const { userId } = await params;
  const patient = await getPatient(userId);

  // Booking needs a patient record; without one the form silently did nothing
  if (!patient) redirect(`/patients/${userId}/register`);

  return (
    <>
      <Navbar userId={userId} />
      <div className="flex h-screen max-h-screen">
        <section className="remove-scrollbar container my-auto">
          <div className="sub-container max-w-[860px] flex-1 justify-between">
            <AppointmentForm
              patientId={patient.$id}
              userId={userId}
              type="create"
            />

            <p className="copyright mt-10 py-12">© 2024 CarePluse</p>
          </div>
        </section>

        <Image
          src="/assets/images/appointment-img.png"
          height={1500}
          width={1500}
          alt="appointment"
          className="side-img max-w-[390px] bg-bottom"
        />
      </div>
    </>
  );
};

export default Appointment;
